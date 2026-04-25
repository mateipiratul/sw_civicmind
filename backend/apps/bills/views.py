import math
from django.db.models import Prefetch, Q
from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.models import User
from .models import Bill, AIAnalysis, VoteSession
from .filters import BillFilterSet
from apps.parliamentarians.models import MPVote
from .serializers import BillListSerializer, BillDetailSerializer, MPVoteInBillSerializer
from apps.parliamentarians.serializers import ParliamentarianVoteMapSerializer
from apps.parliamentarians.models import Parliamentarian, MPVote as ParliamentarianVote
from apps.profiles.models import Profile

class BillViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Bill.objects.all().order_by('-registered_at')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_class = BillFilterSet
    search_fields = ['title', 'bill_number', 'initiator_name']

    def get_serializer_class(self):
        if getattr(self, 'action', None) in ('list', 'feed', 'personalized'):
            return BillListSerializer
        return BillDetailSerializer

    def get_queryset(self):
        return Bill.objects.all().order_by('-registered_at')

    @staticmethod
    def _parse_page(request):
        try:
            return max(1, int(request.query_params.get('page', 1)))
        except (ValueError, TypeError):
            return 1

    @staticmethod
    def _parse_limit(request, default=20, maximum=100):
        try:
            return max(1, min(maximum, int(request.query_params.get('limit', default))))
        except (ValueError, TypeError):
            return default

    def list(self, request, *args, **kwargs):
        """Return paginated bills in the shape the frontend expects."""
        page = self._parse_page(request)
        limit = self._parse_limit(request)

        queryset = self.filter_queryset(self.get_queryset())
        total = queryset.count()
        offset = (page - 1) * limit
        bills = queryset[offset:offset + limit]
        serializer = BillListSerializer(bills, many=True)
        return Response({
            'page': page,
            'limit': limit,
            'total': total,
            'totalPages': math.ceil(total / limit) if total else 1,
            'bills': serializer.data,
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def metadata(self, request):
        # Standard lists as baseline
        categories = ["sanatate", "educatie", "fiscal", "justitie", "mediu", "munca", "administratie", "it", "pensii", "agricultura", "social"]
        profiles = ["student", "angajat", "pensionar", "pfa", "it", "parinte", "agricultor", "antreprenor", "pacient"]
        
        # Get unique counties from parliamentarians
        # Lazy import to avoid circular dependency (parliamentarians -> bills -> parliamentarians)
        from apps.parliamentarians.models import Parliamentarian
        counties = list(Parliamentarian.objects.values_list('county', flat=True).distinct())
        counties = [c for c in counties if c]
        counties.sort()

        return Response({
            "impact_categories": categories,
            "affected_profiles": profiles,
            "counties": counties
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def feed(self, request):
        from datetime import timedelta
        from django.utils import timezone
        
        past_week = timezone.now().date() - timedelta(days=7)
        queryset = self.filter_queryset(self.get_queryset()).filter(registered_at__gte=past_week).order_by('-registered_at')
        
        if not queryset.exists():
            queryset = self.filter_queryset(self.get_queryset()).order_by('-registered_at')[:10]
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny], url_path='votes')
    def votes(self, request, pk=None):
        """
        GET /api/bills/{idp}/votes/
        Returns the MP vote breakdown for this bill's most recent VoteSession.
        Groups votes into For / Against / Abstain / Absent buckets and includes
        the session-level summary counts.
        """
        bill = self.get_object()

        # Grab the most recent vote session for this bill
        vote_session = (
            bill.vote_sessions
            .order_by('-date')
            .first()
        )
        if not vote_session:
            return Response({'detail': 'No vote sessions found for this bill.'}, status=404)

        # Fetch all MP votes for that session, with MP info pre-loaded
        mp_votes = (
            MPVote.objects
            .filter(vote_session=vote_session)
            .select_related('parliamentarian')
            .order_by('parliamentarian__mp_name')
        )

        # Group into buckets
        buckets: dict = {'for': [], 'against': [], 'abstain': [], 'absent': []}
        vote_map = {
            'Pentru': 'for',
            'Contra': 'against',
            'Abtinere': 'abstain',
            'Absent': 'absent',
            'Absentat': 'absent',
        }
        serialized = MPVoteInBillSerializer(mp_votes, many=True).data
        for row in serialized:
            bucket_key = vote_map.get(row['vote'], 'abstain')
            buckets[bucket_key].append(row)

        return Response({
            'bill_idp': bill.idp,
            'bill_number': bill.bill_number,
            'vote_session': {
                'date': vote_session.date,
                'type': vote_session.type,
                'description': vote_session.description,
                'summary': {
                    'present': vote_session.present,
                    'for': vote_session.for_votes,
                    'against': vote_session.against,
                    'abstain': vote_session.abstain,
                    'absent': vote_session.absent,
                },
            },
            'votes': buckets,
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def personalized(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        page = self._parse_page(request)
        limit = self._parse_limit(request)

        user_interests = list(getattr(profile, 'interests', []) or [])
        persona_tags = list(getattr(profile, 'persona_tags', []) or [])
        preferred_party = (getattr(profile, 'preferred_party', None) or '').strip() or None
        county = (getattr(profile, 'county', None) or '').strip() or None

        query = Q()
        for interest in user_interests:
            query |= Q(ai_analysis__impact_categories__contains=[interest])
        for persona in persona_tags:
            query |= Q(ai_analysis__affected_profiles__contains=[persona])

        queryset = self.filter_queryset(self.get_queryset())
        if query.children:
            queryset = queryset.filter(query).distinct()
        else:
            queryset = queryset.none()

        total = queryset.count()
        offset = (page - 1) * limit
        bills = queryset[offset:offset + limit]
        serializer = BillListSerializer(bills, many=True)

        vote_limit = 5
        representatives_queryset = self._get_representatives_queryset(county=county, preferred_party=preferred_party)
        representatives_serializer = ParliamentarianVoteMapSerializer(
            representatives_queryset[:6],
            many=True,
            context={**self.get_serializer_context(), 'vote_limit': vote_limit},
        )

        return Response({
            'page': page,
            'limit': limit,
            'total': total,
            'totalPages': math.ceil(total / limit) if total else 1,
            'bills': serializer.data,
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
            'myRepresentatives': {
                'total': representatives_queryset.count(),
                'voteLimit': vote_limit,
                'parliamentarians': representatives_serializer.data,
            },
        })

    @staticmethod
    def _get_representatives_queryset(*, county, preferred_party):
        vote_queryset = (
            ParliamentarianVote.objects
            .select_related(
                'vote_session',
                'vote_session__bill',
                'vote_session__bill__ai_analysis',
            )
            .order_by('-vote_session__date')
        )
        queryset = (
            Parliamentarian.objects
            .filter(chamber__icontains='deput')
            .select_related('impact_score')
            .prefetch_related(
                Prefetch('votes', queryset=vote_queryset, to_attr='prefetched_votes')
            )
            .order_by('mp_name')
        )
        if county:
            queryset = queryset.filter(county__icontains=county)
        if preferred_party:
            queryset = queryset.filter(party__iexact=preferred_party)
        return queryset

class AdminStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        total_bills = Bill.objects.count()
        active_bills = Bill.objects.filter(status='in_procedura_legislativa').count()
        analyzed_bills = AIAnalysis.objects.count()

        return Response({
            'totalUsers': total_users,
            'activeUsers': active_users,
            'totalBills': total_bills,
            'activeBills': active_bills,
            'analyzedBills': analyzed_bills
        })
