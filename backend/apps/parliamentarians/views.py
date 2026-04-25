import math

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


class ParliamentarianViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_class = ParliamentarianFilterSet
    search_fields = ['mp_name', 'party', 'county']

    def get_queryset(self):
        if self.action == 'vote_map':
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
        if self.action == 'list':
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
        if self.action == 'vote_map':
            return ParliamentarianVoteMapSerializer
        if self.action == 'list':
            return ParliamentarianListSerializer
        return ParliamentarianDetailSerializer

    @action(detail=False, methods=['get'], url_path='vote-map')
    def vote_map(self, request):
        try:
            page = max(1, int(request.query_params.get('page', 1)))
        except (TypeError, ValueError):
            page = 1

        try:
            limit = max(1, min(100, int(request.query_params.get('limit', 25))))
        except (TypeError, ValueError):
            limit = 25

        vote_limit_param = request.query_params.get('vote_limit')
        try:
            vote_limit = None if vote_limit_param in (None, '', 'all') else max(1, int(vote_limit_param))
        except (TypeError, ValueError):
            vote_limit = 50

        queryset = (
            self.filter_queryset(self.get_queryset())
            .filter(chamber__icontains='deput')
            .order_by('mp_name')
        )

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
