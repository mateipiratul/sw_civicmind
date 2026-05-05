import math
from collections import Counter

from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Prefetch
from .models import Parliamentarian
from .filters import ParliamentarianFilterSet
from .serializers import (
    ParliamentarianListSerializer,
    ParliamentarianDetailSerializer,
    ParliamentarianVoteMapSerializer,
)
from .models import MPVote

ROMANIAN_COUNTIES = [
    'Alba',
    'Arad',
    'Argeș',
    'Bacău',
    'Bihor',
    'Bistrița-Năsăud',
    'Botoșani',
    'Brăila',
    'Brașov',
    'București',
    'Buzău',
    'Călărași',
    'Caraș-Severin',
    'Cluj',
    'Constanța',
    'Covasna',
    'Dâmbovița',
    'Dolj',
    'Galați',
    'Giurgiu',
    'Gorj',
    'Harghita',
    'Hunedoara',
    'Ialomița',
    'Iași',
    'Ilfov',
    'Maramureș',
    'Mehedinți',
    'Mureș',
    'Neamț',
    'Olt',
    'Prahova',
    'Sălaj',
    'Satu Mare',
    'Sibiu',
    'Suceava',
    'Teleorman',
    'Timiș',
    'Tulcea',
    'Vâlcea',
    'Vaslui',
    'Vrancea',
]


class ParliamentarianViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_class = ParliamentarianFilterSet
    search_fields = ['mp_name', 'party', 'county']

    def get_queryset(self):
        if self.action in {'vote_map', 'my_representatives'}:
            vote_queryset = (
                MPVote.objects
                .select_related(
                    'vote_session',
                    'vote_session__bill',
                    'vote_session__bill__ai_analysis',
                )
                .order_by('-vote_session__date')
            )
            return (
                Parliamentarian.objects
                .select_related('impact_score')
                .prefetch_related(Prefetch('votes', queryset=vote_queryset, to_attr='prefetched_votes'))
                .order_by('mp_name')
            )
        if self.action in {'list', 'directory', 'metadata'}:
            # For the list view, only prefetch the impact_score (1 extra query total)
            return Parliamentarian.objects.select_related('impact_score').order_by('mp_name')
        # For the detail view, also prefetch the vote chain to avoid N+1
        return (
            Parliamentarian.objects
            .select_related('impact_score')
            .prefetch_related(
                'votes__vote_session__bill__ai_analysis',
            )
            .order_by('mp_name')
        )

    def get_serializer_class(self):
        if self.action in {'vote_map', 'my_representatives'}:
            return ParliamentarianVoteMapSerializer
        if self.action in {'list', 'directory', 'metadata'}:
            return ParliamentarianListSerializer
        return ParliamentarianDetailSerializer

    @staticmethod
    def _parse_page(request):
        try:
            return max(1, int(request.query_params.get('page', 1)))
        except (TypeError, ValueError):
            return 1

    @staticmethod
    def _parse_limit(request, default=25, maximum=100):
        try:
            return max(1, min(maximum, int(request.query_params.get('limit', default))))
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _parse_vote_limit(request):
        vote_limit_param = request.query_params.get('vote_limit')
        try:
            return None if vote_limit_param in (None, '', 'all') else max(1, int(vote_limit_param))
        except (TypeError, ValueError):
            return 50

    @staticmethod
    def _paginated_response(*, queryset, serializer, page, limit, extra=None):
        total = queryset.count()
        offset = (page - 1) * limit
        items = queryset[offset:offset + limit]
        payload = {
            'page': page,
            'limit': limit,
            'total': total,
            'totalPages': math.ceil(total / limit) if total else 1,
            'parliamentarians': serializer(items, many=True).data,
        }
        if extra:
            payload.update(extra)
        return Response(payload)

    def list(self, request, *args, **kwargs):
        page = self._parse_page(request)
        limit = self._parse_limit(request)
        queryset = self.filter_queryset(self.get_queryset())
        return self._paginated_response(
            queryset=queryset,
            serializer=self.get_serializer,
            page=page,
            limit=limit,
        )

    def _base_deputies_queryset(self):
        return self.filter_queryset(self.get_queryset()).filter(chamber__icontains='deput').order_by('mp_name')

    @action(detail=False, methods=['get'], url_path='directory')
    def directory(self, request):
        page = self._parse_page(request)
        limit = self._parse_limit(request)
        queryset = self._base_deputies_queryset()

        return self._paginated_response(
            queryset=queryset,
            serializer=self.get_serializer,
            page=page,
            limit=limit,
        )

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
        page = self._parse_page(request)
        limit = self._parse_limit(request)
        vote_limit = self._parse_vote_limit(request)

        queryset = self._base_deputies_queryset()
        total = queryset.count()
        offset = (page - 1) * limit
        parliamentarians = queryset[offset:offset + limit]
        serializer = self.get_serializer(
            parliamentarians,
            many=True,
            context={**self.get_serializer_context(), 'vote_limit': vote_limit},
        )

        return Response({
            'page': page,
            'limit': limit,
            'voteLimit': vote_limit,
            'total': total,
            'totalPages': math.ceil(total / limit) if total else 1,
            'parliamentarians': serializer.data,
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
        page = self._parse_page(request)
        limit = self._parse_limit(request, default=20)
        vote_limit = self._parse_vote_limit(request)

        queryset = self._base_deputies_queryset().filter(county__icontains=county)
        if party:
            queryset = queryset.filter(party__iexact=party)

        total = queryset.count()
        offset = (page - 1) * limit
        parliamentarians = queryset[offset:offset + limit]
        serializer = ParliamentarianVoteMapSerializer(
            parliamentarians,
            many=True,
            context={**self.get_serializer_context(), 'vote_limit': vote_limit},
        )

        return Response({
            'page': page,
            'limit': limit,
            'voteLimit': vote_limit,
            'filters': {
                'county': county,
                'party': party or None,
                'chamber': 'deputies',
            },
            'total': total,
            'totalPages': math.ceil(total / limit) if total else 1,
            'parliamentarians': serializer.data,
        })
