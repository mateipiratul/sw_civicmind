from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Parliamentarian
from .filters import ParliamentarianFilterSet
from .serializers import ParliamentarianListSerializer, ParliamentarianDetailSerializer


class ParliamentarianViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_class = ParliamentarianFilterSet
    search_fields = ['mp_name', 'party', 'county']

    def get_queryset(self):
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
        if self.action == 'list':
            return ParliamentarianListSerializer
        return ParliamentarianDetailSerializer
