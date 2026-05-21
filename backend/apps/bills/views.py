from collections import Counter
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.models import User

from .models import Bill, AIAnalysis
from .filters import BillFilterSet
from .serializers import BillListSerializer, BillDetailSerializer
from .services import FeedService, VoteAnalyticsService
from apps.parliamentarians.models import Parliamentarian
from apps.parliamentarians.serializers import ParliamentarianVoteMapSerializer
from apps.profiles.models import Profile
from apps.core.pagination import BillPagination

DEFAULT_TRENDING_TOPICS = ["Sănătate", "Educație", "Mediu", "Justiție", "Fiscal", "Muncă"]

from django.db.models import Count, Case, When

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

    def list(self, request, *args, **kwargs):
        # 1. Get filtered and paginated IDs first (fast)
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            # 2. Fetch full objects with all relations only for the IDs on current page
            bill_ids = [bill.pk for bill in page]
            full_bills = Bill.objects.filter(pk__in=bill_ids).select_related('ai_analysis').prefetch_related(
                'ai_analysis__rel_impact_categories',
                'ai_analysis__rel_affected_profiles',
                'ai_analysis__rel_key_ideas',
                'ai_analysis__rel_arguments'
            ).order_by('-registered_at')
            
            serializer = self.get_serializer(full_bills, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def personalized(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        user_interests = list(getattr(profile, 'interests', []) or [])
        persona_tags = list(getattr(profile, 'persona_tags', []) or [])
        county = (getattr(profile, 'county', None) or '').strip() or None
        preferred_party = (getattr(profile, 'preferred_party', None) or '').strip() or None

        # 1. Get personalized IDs (fast using Exists)
        base_queryset = self.filter_queryset(self.get_queryset())
        queryset = FeedService.get_personalized_bills(
            user_interests=user_interests, 
            persona_tags=persona_tags,
            queryset=base_queryset
        )

        page = self.paginate_queryset(queryset)
        
        # Helper to fetch full bills with all relations
        def get_full_bills(subset):
            bill_ids = [bill.pk for bill in subset]
            # Maintain the same ordering as the original queryset
            order_case = Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(bill_ids)])
            return Bill.objects.filter(pk__in=bill_ids).select_related('ai_analysis').prefetch_related(
                'ai_analysis__rel_impact_categories',
                'ai_analysis__rel_affected_profiles',
                'ai_analysis__rel_key_ideas',
                'ai_analysis__rel_arguments',
            ).order_by(order_case)

        if page is not None:
            full_bills = get_full_bills(page)
            serializer = self.get_serializer(full_bills, many=True)
            response = self.get_paginated_response(serializer.data)
            
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
            })
            return response

        # Non-paginated fallback
        full_bills = get_full_bills(queryset[:100]) # Limit to 100 for safety
        serializer = self.get_serializer(full_bills, many=True)
        return Response({
            'page': 1,
            'limit': len(serializer.data),
            'total': len(serializer.data),
            'totalPages': 1,
            'bills': serializer.data,
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
