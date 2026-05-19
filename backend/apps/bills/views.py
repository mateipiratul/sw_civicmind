from collections import Counter
from django.db.models import Prefetch, Case, When, Value, IntegerField, Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.models import User

from .models import Bill, AIAnalysis
from .filters import BillFilterSet
from .serializers import BillListSerializer, BillDetailSerializer, MPVoteInBillSerializer
from .services import SearchService
from apps.parliamentarians.models import Parliamentarian, MPVote
from apps.parliamentarians.serializers import ParliamentarianVoteMapSerializer, ParliamentarianListSerializer
from apps.profiles.models import Profile
from apps.core.pagination import BillPagination

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

    def _get_request_limit(self, default=20, maximum=100):
        try:
            return max(1, min(maximum, int(self.request.query_params.get('limit', default))))
        except (ValueError, TypeError):
            return default

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def metadata(self, request):
        categories = ["sanatate", "educatie", "fiscal", "justitie", "mediu", "munca", "administratie", "it", "pensii", "agricultura", "social"]
        profiles = ["student", "angajat", "pensionar", "pfa", "it", "parinte", "agricultor", "antreprenor", "pacient"]
        counties = sorted([c for c in Parliamentarian.objects.values_list('county', flat=True).distinct() if c])
        return Response({
            "impact_categories": categories,
            "affected_profiles": profiles,
            "counties": counties
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny], url_path='trending')
    def trending(self, request):
        limit = self._get_request_limit(default=6, maximum=12)
        recent_bills = Bill.objects.select_related('ai_analysis').order_by('-registered_at')[:200]
        counter = Counter()
        for bill in recent_bills:
            analysis = getattr(bill, 'ai_analysis', None)
            if analysis and analysis.impact_categories:
                for category in analysis.impact_categories:
                    if category: counter[category] += 1
        topics = [{"label": label, "count": count} for label, count in counter.most_common(limit)]
        if not topics:
            from .views import DEFAULT_TRENDING_TOPICS # Fallback
            topics = [{"label": label, "count": 0} for label in ["Sănătate", "Educație", "Mediu", "Justiție", "Fiscal", "Muncă"][:limit]]
        return Response({"topics": topics})

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def feed(self, request):
        from datetime import timedelta
        from django.utils import timezone
        past_week = timezone.now().date() - timedelta(days=7)
        queryset = self.filter_queryset(self.get_queryset()).filter(registered_at__gte=past_week)
        if not queryset.exists():
            queryset = self.filter_queryset(self.get_queryset())
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny], url_path='votes')
    def votes(self, request, pk=None):
        bill = self.get_object()
        vote_session = bill.vote_sessions.order_by('-date').first()
        if not vote_session:
            return Response({'detail': 'No vote sessions found for this bill.'}, status=status.HTTP_404_NOT_FOUND)
        mp_votes = MPVote.objects.filter(vote_session=vote_session).select_related('parliamentarian').order_by('parliamentarian__mp_name')
        buckets = {'for': [], 'against': [], 'abstain': [], 'absent': []}
        vote_map = {'Pentru': 'for', 'Contra': 'against', 'Abtinere': 'abstain', 'Abținere': 'abstain', 'Absent': 'absent', 'Absentat': 'absent'}
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
        user_interests = list(getattr(profile, 'interests', []) or [])
        persona_tags = list(getattr(profile, 'persona_tags', []) or [])
        preferred_party = (getattr(profile, 'preferred_party', None) or '').strip() or None
        county = (getattr(profile, 'county', None) or '').strip() or None

        query = self._build_personalized_query(user_interests, persona_tags)

        queryset = self.filter_queryset(self.get_queryset())
        if query:
            queryset = queryset.annotate(
                is_match=Case(When(query, then=Value(1)), default=Value(0), output_field=IntegerField())
            ).order_by('-is_match', '-registered_at').distinct()
        else:
            queryset = queryset.order_by('-registered_at')

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            
            # Add extra metadata to paginated response
            vote_limit = 5
            reps_queryset = self._get_representatives_queryset(county=county, preferred_party=preferred_party)
            reps_serializer = ParliamentarianVoteMapSerializer(
                reps_queryset[:6], many=True,
                context={**self.get_serializer_context(), 'vote_limit': vote_limit}
            )
            
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
                'myRepresentatives': {
                    'total': reps_queryset.count(),
                    'voteLimit': vote_limit,
                    'parliamentarians': reps_serializer.data,
                },
            })
            return response

        serializer = self.get_serializer(queryset, many=True)
        return Response({'bills': serializer.data})

    def _build_personalized_query(self, user_interests, persona_tags):
        from django.db.models import Q
        query = Q()
        for interest in user_interests:
            query |= Q(ai_analysis__impact_categories__contains=[interest])
        for persona in persona_tags:
            query |= Q(ai_analysis__affected_profiles__contains=[persona])
        return query if query.children else None

    @staticmethod
    def _get_representatives_queryset(*, county, preferred_party):
        vote_queryset = MPVote.objects.select_related(
            'vote_session', 'vote_session__bill', 'vote_session__bill__ai_analysis',
        ).order_by('-vote_session__date')
        queryset = Parliamentarian.objects.filter(chamber__icontains='deput').select_related('impact_score').prefetch_related(
            Prefetch('votes', queryset=vote_queryset, to_attr='prefetched_votes')
        ).order_by('mp_name')
        if county: queryset = queryset.filter(county__icontains=county)
        if preferred_party: queryset = queryset.filter(party__iexact=preferred_party)
        return queryset

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

class GlobalSearchView(APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request):
        raw_query = request.query_params.get('q', '')
        search_results = SearchService.execute_global_search(raw_query)
        
        if not search_results['query']:
            return Response(search_results)

        bill_list = search_results['laws']
        mp_list = search_results['mps']
        relation_map = search_results['relation_map']
        
        # Format results using serializers
        bill_data = BillListSerializer(bill_list, many=True).data
        
        mp_data = []
        for row in ParliamentarianListSerializer(mp_list, many=True).data:
            rel = relation_map.get(row['mp_slug'], {
                'keyword': search_results['query'], 
                'billIds': [], 'billNumbers': [], 'relatedBills': 0, 
                'forVotes': 0, 'againstVotes': 0, 'abstainVotes': 0, 'absentVotes': 0
            })
            if rel['relatedBills'] > 0:
                row['relation'] = rel
                mp_data.append(row)
        
        # Sort MPs
        mp_data = sorted(mp_data, key=lambda x: (
            -x['relation']['relatedBills'], 
            -(x['relation']['forVotes'] + x['relation']['againstVotes']), 
            x['mp_name'] or ''
        ))

        return Response({
            'query': search_results['query'],
            'exactMatch': BillListSerializer(search_results['exactMatch']).data if search_results['exactMatch'] else None,
            'laws': bill_data,
            'mps': mp_data,
            'filters': {
                'laws': {
                    'statuses': sorted({b.status for b in bill_list if b.status}),
                    'initiators': sorted({b.initiator_name for b in bill_list if b.initiator_name})[:40],
                    'categories': sorted({cat for b in bill_list if b.ai_analysis for cat in b.ai_analysis.impact_categories if cat})[:20],
                },
                'mps': {
                    'parties': sorted({m.party for m in mp_list if m.party}),
                    'counties': sorted({m.county for m in mp_list if m.county}),
                    'chambers': sorted({m.chamber for m in mp_list if m.chamber}),
                },
            },
            'counts': {
                'laws': search_results['total_laws'],
                'mps': len(mp_data),
            },
        })
