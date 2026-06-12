import math
import hashlib
from collections import Counter

from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Prefetch, Q
from .models import Parliamentarian, MPVote
from .filters import ParliamentarianFilterSet
from .serializers import (
    ParliamentarianListSerializer,
    ParliamentarianDetailSerializer,
    ParliamentarianVoteMapSerializer,
)
from apps.core.pagination import ParliamentarianPagination
from apps.core.services import CacheService
from apps.core.constants import ROMANIAN_COUNTIES
from apps.core.decorators import cache_endpoint
from .text_utils import dedupe_parliamentarians, repair_text


def _with_vote_score_annotations(queryset):
    return queryset.annotate(
        fallback_total_votes=Count("votes", distinct=True),
        fallback_for_count=Count(
            "votes",
            filter=Q(votes__vote__iexact="for") | Q(votes__vote__iexact="pentru"),
            distinct=True,
        ),
        fallback_against_count=Count(
            "votes",
            filter=Q(votes__vote__iexact="against") | Q(votes__vote__iexact="contra"),
            distinct=True,
        ),
        fallback_abstain_count=Count(
            "votes",
            filter=(
                Q(votes__vote__iexact="abstain")
                | Q(votes__vote__iexact="abtinere")
                | Q(votes__vote__iexact="abținere")
            ),
            distinct=True,
        ),
        fallback_absent_count=Count(
            "votes",
            filter=Q(votes__vote__iexact="absent") | Q(votes__vote__iexact="absentat"),
            distinct=True,
        ),
    )


def _parliamentarian_cache_key(view_instance, request, *args, **kwargs):
    query_string = request.META.get("QUERY_STRING", "")
    user_id = request.user.id if request.user.is_authenticated else "anon"
    lookup_value = kwargs.get(view_instance.lookup_field or "pk", "")
    raw_key = (
        f"parliamentarians_v4:"
        f"{getattr(view_instance, 'action', '')}:"
        f"{request.path}:"
        f"{lookup_value}:"
        f"{query_string}:"
        f"{user_id}"
    )
    return f"endpoint_{hashlib.md5(raw_key.encode('utf-8')).hexdigest()}"


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
            return _with_vote_score_annotations(
                Parliamentarian.objects
                .select_related('impact_score')
                .prefetch_related(Prefetch('votes', queryset=vote_queryset, to_attr='prefetched_votes'))
                .order_by('mp_name')
            )
        
        return _with_vote_score_annotations(
            Parliamentarian.objects.select_related('impact_score').order_by('mp_name')
        )

    def get_serializer_class(self):
        if self.action in {'vote_map', 'my_representatives'}:
            return ParliamentarianVoteMapSerializer
        if self.action in {'list', 'directory', 'metadata'}:
            return ParliamentarianListSerializer
        return ParliamentarianDetailSerializer

    @cache_endpoint(key_func=_parliamentarian_cache_key)
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @cache_endpoint(key_func=_parliamentarian_cache_key)
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        items = dedupe_parliamentarians(queryset)
        page = self.paginate_queryset(items)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(items, many=True)
        return Response(serializer.data)

    def _base_deputies_queryset(self):
        return self.filter_queryset(self.get_queryset()).filter(chamber__icontains='deput').order_by('mp_name')

    @action(detail=False, methods=['get'], url_path='directory')
    @cache_endpoint(key_func=_parliamentarian_cache_key)
    def directory(self, request):
        items = dedupe_parliamentarians(self._base_deputies_queryset())
        page = self.paginate_queryset(items)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='metadata')
    @cache_endpoint(key_func=_parliamentarian_cache_key)
    def metadata(self, request):
        parliamentarians = dedupe_parliamentarians(Parliamentarian.objects.all())
        counties = sorted({
            repair_text(mp.county) for mp in parliamentarians if mp.county
        })
        parties = sorted({
            repair_text(mp.party) for mp in parliamentarians if mp.party
        })
        chamber_counts = dict(Counter(
            repair_text(mp.chamber) or "unknown" for mp in parliamentarians
        ))

        data = {
            'counties': counties or ROMANIAN_COUNTIES,
            'parties': parties,
            'chambers': chamber_counts,
            'hasCountyData': bool(counties),
        }
        return Response(data)

    @action(detail=False, methods=['get'], url_path='vote-map')
    @cache_endpoint(key_func=_parliamentarian_cache_key)
    def vote_map(self, request):
        vote_limit = self.get_serializer_context().get('vote_limit')
        items = dedupe_parliamentarians(self._base_deputies_queryset())
        
        page = self.paginate_queryset(items)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data['voteLimit'] = vote_limit
            return response

        serializer = self.get_serializer(items, many=True)
        return Response({
            'parliamentarians': serializer.data,
            'voteLimit': vote_limit
        })

    @action(detail=False, methods=['get'], url_path='my-representatives')
    @cache_endpoint(key_func=_parliamentarian_cache_key)
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

        base_queryset = self.get_queryset().filter(chamber__icontains='deput').order_by('mp_name')
        filter_data = {'county': county}
        if party:
            filter_data['party'] = party
            
        filterset = ParliamentarianFilterSet(data=filter_data, queryset=base_queryset, request=request)
        if filterset.is_valid():
            items = dedupe_parliamentarians(filterset.qs)
        else:
            return Response(filterset.errors, status=400)

        page = self.paginate_queryset(items)
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

        serializer = self.get_serializer(items, many=True)
        return Response({
            'parliamentarians': serializer.data,
            'voteLimit': vote_limit,
            'filters': {
                'county': county,
                'party': party or None,
                'chamber': 'deputies',
            }
        })
