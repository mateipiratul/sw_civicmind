import math
from collections import Counter

from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Prefetch
from .models import Parliamentarian, MPVote
from .filters import ParliamentarianFilterSet
from .serializers import (
    ParliamentarianListSerializer,
    ParliamentarianDetailSerializer,
    ParliamentarianVoteMapSerializer,
)
from apps.core.pagination import ParliamentarianPagination

ROMANIAN_COUNTIES = [
    'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani', 'Brăila',
    'Brașov', 'București', 'Buzău', 'Călărași', 'Caraș-Severin', 'Cluj', 'Constanța',
    'Covasna', 'Dâmbovița', 'Dolj', 'Galați', 'Giurgiu', 'Gorj', 'Harghita', 'Hunedoara',
    'Ialomița', 'Iași', 'Ilfov', 'Maramureș', 'Mehedinți', 'Mureș', 'Neamț', 'Olt',
    'Prahova', 'Sălaj', 'Satu Mare', 'Sibiu', 'Suceava', 'Teleorman', 'Timiș', 'Tulcea',
    'Vâlcea', 'Vaslui', 'Vrancea',
]


class ParliamentarianViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_class = ParliamentarianFilterSet
    search_fields = ['mp_name', 'party', 'county']
    pagination_class = ParliamentarianPagination

    def get_serializer_context(self):
        context = super().get_serializer_context()
        raw_bill_ids = self.request.query_params.get('bill_ids', '')
        raw_bill_numbers = self.request.query_params.get('bill_numbers', '')
        
        bill_ids = []
        for item in raw_bill_ids.split(','):
            try:
                if item.strip():
                    bill_ids.append(int(item))
            except (TypeError, ValueError):
                continue
        context['bill_ids'] = bill_ids
        context['bill_numbers'] = [item.strip() for item in raw_bill_numbers.split(',') if item.strip()]
        
        # vote_limit for serializers
        vote_limit_param = self.request.query_params.get('vote_limit')
        try:
            context['vote_limit'] = None if vote_limit_param in (None, '', 'all') else max(1, int(vote_limit_param))
        except (TypeError, ValueError):
            context['vote_limit'] = 50

        return context

    def get_queryset(self):
        # Optimized vote queryset for prefetching
        vote_queryset = (
            MPVote.objects
            .select_related(
                'vote_session',
                'vote_session__bill',
                'vote_session__bill__ai_analysis',
            )
            .prefetch_related(
                'vote_session__bill__ai_analysis__rel_impact_categories'
            )
            .only(
                'id', 'vote_session_id', 'parliamentarian_id', 'vote', 'party',
                'vote_session__date', 'vote_session__type',
                'vote_session__bill__idp', 'vote_session__bill__bill_number', 
                'vote_session__bill__title', 'vote_session__bill__status',
                'vote_session__bill__ai_analysis__title_short',
                'vote_session__bill__ai_analysis__controversy_score',
            )
            .order_by('-vote_session__date')
        )

        # Apply global filters to prefetched votes if provided in query params
        raw_bill_ids = self.request.query_params.get('bill_ids', '')
        raw_bill_numbers = self.request.query_params.get('bill_numbers', '')
        
        if raw_bill_ids:
            bill_ids = [int(i) for i in raw_bill_ids.split(',') if i.strip().isdigit()]
            if bill_ids:
                vote_queryset = vote_queryset.filter(vote_session__bill__idp__in=bill_ids)
        elif raw_bill_numbers:
            bill_numbers = [n.strip() for n in raw_bill_numbers.split(',') if n.strip()]
            if bill_numbers:
                vote_queryset = vote_queryset.filter(vote_session__bill__bill_number__in=bill_numbers)

        if self.action in {'vote_map', 'my_representatives', 'retrieve'}:
            # Optimization: If we are not filtering by specific bills, we might want to limit 
            # the number of votes fetched per MP. However, Django's Prefetch doesn't support slicing.
            # For now, we rely on field limiting (only()) and Python-side slicing in serializers.
            return (
                Parliamentarian.objects
                .select_related('impact_score')
                .prefetch_related(Prefetch('votes', queryset=vote_queryset, to_attr='prefetched_votes'))
                .order_by('mp_name')
            )
        
        return Parliamentarian.objects.select_related('impact_score').order_by('mp_name')

    def get_serializer_class(self):
        if self.action in {'vote_map', 'my_representatives'}:
            return ParliamentarianVoteMapSerializer
        if self.action in {'list', 'directory', 'metadata'}:
            return ParliamentarianListSerializer
        return ParliamentarianDetailSerializer

    def _base_deputies_queryset(self):
        return self.filter_queryset(self.get_queryset()).filter(chamber__icontains='deput').order_by('mp_name')

    @action(detail=False, methods=['get'], url_path='directory')
    def directory(self, request):
        queryset = self._base_deputies_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='metadata')
    def metadata(self, request):
        parliamentarians = Parliamentarian.objects.all()
        counties = sorted(
            county
            for county in parliamentarians.exclude(county__isnull=True).exclude(county='').values_list('county', flat=True).distinct()
        )
        parties = sorted(
            party
            for party in parliamentarians.exclude(party__isnull=True).exclude(party='').values_list('party', flat=True).distinct()
        )
        chamber_counts = Counter(
            chamber or 'unknown'
            for chamber in parliamentarians.values_list('chamber', flat=True)
        )

        return Response({
            'counties': counties or ROMANIAN_COUNTIES,
            'parties': parties,
            'chambers': dict(chamber_counts),
            'hasCountyData': bool(counties),
        })

    @action(detail=False, methods=['get'], url_path='vote-map')
    def vote_map(self, request):
        vote_limit = self.get_serializer_context().get('vote_limit')
        queryset = self._base_deputies_queryset()
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data['voteLimit'] = vote_limit
            return response

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'parliamentarians': serializer.data,
            'voteLimit': vote_limit
        })

    @action(detail=False, methods=['get'], url_path='my-representatives')
    def my_representatives(self, request):
        profile = getattr(request.user, 'profile', None) if getattr(request.user, 'is_authenticated', False) else None
        county = (request.query_params.get('county') or getattr(profile, 'county', '') or '').strip()
        if not county:
            return Response(
                {'detail': 'Query parameter "county" is required.'},
                status=400,
            )

        party = (request.query_params.get('party') or getattr(profile, 'preferred_party', '') or '').strip()
        vote_limit = self.get_serializer_context().get('vote_limit')

        # Use ParliamentarianFilterSet to standardize filtering instead of manual filters
        base_queryset = self.get_queryset().filter(chamber__icontains='deput').order_by('mp_name')
        filter_data = {'county': county}
        if party:
            filter_data['party'] = party
            
        filterset = ParliamentarianFilterSet(data=filter_data, queryset=base_queryset, request=request)
        if filterset.is_valid():
            queryset = filterset.qs
        else:
            return Response(filterset.errors, status=400)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data.update({
                'voteLimit': vote_limit,
                'filters': {
                    'county': county,
                    'party': party or None,
                    'chamber': 'deputies',
                }
            })
            return response

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'parliamentarians': serializer.data,
            'voteLimit': vote_limit,
            'filters': {
                'county': county,
                'party': party or None,
                'chamber': 'deputies',
            }
        })
