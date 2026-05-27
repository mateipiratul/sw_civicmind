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
from .services import FeedService, VoteAnalyticsService, BillService
from apps.parliamentarians.models import Parliamentarian
from apps.parliamentarians.serializers import ParliamentarianVoteMapSerializer
from apps.profiles.models import Profile
from apps.core.pagination import BillPagination, PersonalizedFeedPagination
from apps.core.constants import DEFAULT_TRENDING_TOPICS

from django.db.models import Count, Case, When, IntegerField

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
        if self.action in ('list', 'personalized', 'retrieve'):
            return BillService.get_enriched_bills_queryset().order_by('-registered_at')
        return queryset

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def personalized(self, request):
        self.pagination_class = PersonalizedFeedPagination
        profile, _ = Profile.objects.get_or_create(user=request.user)
        user_interests = list(getattr(profile, 'interests', []) or [])
        persona_tags = list(getattr(profile, 'persona_tags', []) or [])
        county = (getattr(profile, 'county', None) or '').strip() or None
        preferred_party = (getattr(profile, 'preferred_party', None) or '').strip() or None

        # 1. Get filtered base queryset
        base_queryset = self.filter_queryset(self.get_queryset())
        
        # 2. Apply personalization logic
        queryset = FeedService.get_personalized_bills(
            user_interests=user_interests, 
            persona_tags=persona_tags,
            queryset=base_queryset
        )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
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
        serializer = self.get_serializer(queryset[:100], many=True)
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
