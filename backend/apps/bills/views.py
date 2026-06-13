from collections import Counter
import hashlib
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.models import User
from django.conf import settings
import logging
import traceback

from .models import Bill, AIAnalysis
from .filters import BillFilterSet
from .serializers import BillListSerializer, BillDetailSerializer
from .services import FeedService, VoteAnalyticsService, BillService
from apps.parliamentarians.models import Parliamentarian
from apps.parliamentarians.serializers import ParliamentarianVoteMapSerializer
from apps.profiles.models import Profile
from apps.core.pagination import BillPagination
from apps.core.constants import DEFAULT_TRENDING_TOPICS

from django.db.models import Count, Case, When, IntegerField
from apps.core.decorators import cache_endpoint


def _bill_cache_key(view_instance, request, *args, **kwargs):
    query_string = request.META.get('QUERY_STRING', '')
    user_id = request.user.id if request.user.is_authenticated else 'anon'
    lookup_value = kwargs.get(view_instance.lookup_field or 'pk', '')
    raw_key = (
        f"bills_v2:"
        f"{getattr(view_instance, 'action', '')}:"
        f"{request.path}:"
        f"{lookup_value}:"
        f"{query_string}:"
        f"{user_id}"
    )
    return f"endpoint_{hashlib.md5(raw_key.encode('utf-8')).hexdigest()}"


class BillViewSet(viewsets.ReadOnlyModelViewSet):

    queryset = Bill.objects.all().order_by('-registered_at')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_class = BillFilterSet
    pagination_class = BillPagination

    def get_serializer_class(self):
        if self.action in ('list', 'feed', 'personalized'):
            return BillListSerializer
        return BillDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action in ('list', 'personalized'):
            return BillService.get_list_bills_queryset().order_by('-registered_at')
        elif self.action in ('retrieve', 'votes'):
            return BillService.get_detail_bills_queryset().order_by('-registered_at')
        return queryset

    @cache_endpoint()
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @cache_endpoint()
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    @cache_endpoint(key_func=_bill_cache_key)
    def votes(self, request, pk=None):
        bill = self.get_object()
        # Get the latest final vote session
        vote_session = bill.vote_sessions.filter(type='final').order_by('-date').first()
        if not vote_session:
            # Fallback to any latest session if no final one
            vote_session = bill.vote_sessions.order_by('-date').first()

        if not vote_session:
            return Response({
                "bill_idp": bill.idp,
                "bill_number": bill.bill_number,
                "vote_session": None,
                "votes": {"for": [], "against": [], "abstain": [], "absent": []}
            })

        buckets = VoteAnalyticsService.get_bill_vote_buckets(vote_session)
        
        return Response({
            "bill_idp": bill.idp,
            "bill_number": bill.bill_number,
            "vote_session": {
                "date": vote_session.date,
                "type": vote_session.type,
                "description": vote_session.description,
                "summary": {
                    "present": vote_session.present,
                    "for": vote_session.for_votes,
                    "against": vote_session.against,
                    "abstain": vote_session.abstain,
                    "absent": vote_session.absent,
                }
            },
            "votes": buckets
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    @cache_endpoint()
    def personalized(self, request):
        logger = logging.getLogger(__name__)
        try:
            self.pagination_class = BillPagination
            profile, _ = Profile.objects.get_or_create(user=request.user)
            user_interests = list(getattr(profile, 'interests', []) or [])
            persona_tags = list(getattr(profile, 'persona_tags', []) or [])
            county = (getattr(profile, 'county', None) or '').strip() or None
            preferred_party = (getattr(profile, 'preferred_party', None) or '').strip() or None

            # 1. Get filtered base queryset
            base_queryset = self.filter_queryset(self.get_queryset())
            
            # 2. Apply personalization logic (annotated & ordered)
            queryset = FeedService.get_personalized_bills(
                user_interests=user_interests,
                persona_tags=persona_tags,
                queryset=base_queryset,
            )

            # 3. Build prioritized page first, then a deduped general feed.
            # Determine requested page size (fallback to pagination default)
            try:
                req_limit = int(request.query_params.get('limit')) if request.query_params.get('limit') else None
            except (TypeError, ValueError):
                req_limit = None

            default_limit = getattr(self.pagination_class, 'page_size', 20)
            page_limit = req_limit or default_limit

            # If user has no preferences, show a larger general feed
            general_limit = page_limit * 2 if not user_interests and not persona_tags else page_limit

            paginator = BillPagination()
            self._paginator = paginator
            page = paginator.paginate_queryset(queryset, request, view=self)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                response = self.get_paginated_response(serializer.data)
                # Also include a separate general feed (most recent bills), deduped
                prioritized_ids = [getattr(obj, 'id', None) or getattr(obj, 'pk', None) for obj in page]
                general_qs = base_queryset.exclude(pk__in=[i for i in prioritized_ids if i is not None]).order_by('-registered_at')[:general_limit]
                general_serializer = self.get_serializer(general_qs, many=True)
                response.data.update({
                    'profile': {
                        'county': county,
                        'preferredParty': preferred_party,
                        'interests': user_interests,
                        'personaTags': persona_tags,
                        'questionnaireCompleted': bool(getattr(profile, 'questionnaire_completed', False)),
                    },
                    'appliedFilters': {
                        'impactCategories': user_interests,
                        'affectedProfiles': persona_tags,
                        'county': county,
                        'party': preferred_party,
                    },
                    'generalFeed': general_serializer.data,
                })
                return response

            # Non-paginated fallback
            serializer = self.get_serializer(queryset[:100], many=True)
            prioritized_ids = [getattr(obj, 'id', None) or getattr(obj, 'pk', None) for obj in queryset[:100]]
            general_qs = base_queryset.exclude(pk__in=[i for i in prioritized_ids if i is not None]).order_by('-registered_at')[:general_limit]
            general_serializer = self.get_serializer(general_qs, many=True)
            return Response({
                'page': 1,
                'limit': len(serializer.data),
                'total': len(serializer.data),
                'totalPages': 1,
                'bills': serializer.data,
                'generalFeed': general_serializer.data,
                'profile': {
                    'county': county, 'preferredParty': preferred_party,
                    'interests': user_interests, 'personaTags': persona_tags,
                    'questionnaireCompleted': bool(getattr(profile, 'questionnaire_completed', False)),
                },
                'appliedFilters': {
                    'impactCategories': user_interests, 'affectedProfiles': persona_tags,
                    'county': county, 'party': preferred_party,
                },
            })
        except Exception as exc:
            # Log full traceback for debugging
            tb = traceback.format_exc()
            logger.exception("Error in personalized feed view: %s", exc)
            # In DEBUG mode, return the traceback in response to help local debugging.
            if getattr(settings, 'DEBUG', False):
                return Response({'detail': 'Internal Server Error', 'error': str(exc), 'traceback': tb}, status=500)
            return Response({'detail': 'Internal Server Error'}, status=500)

class AdminStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]
    def get(self, request):
        return Response({
            'totalUsers': User.objects.count(),
            'activeUsers': User.objects.filter(is_active=True).count(),
            'totalBills': Bill.objects.count(),
            'activeBills': Bill.objects.filter(status='in_procedura_legislativa').count(),
            'analyzedBills': AIAnalysis.objects.count()
        })
