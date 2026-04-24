from rest_framework import viewsets, permissions, filters
from .models import Parliamentarian
from .serializers import ParliamentarianListSerializer, ParliamentarianDetailSerializer

class ParliamentarianViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Parliamentarian.objects.all().order_by('mp_name')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['mp_name', 'party', 'county']

    def get_serializer_class(self):
        if self.action == 'list':
            return ParliamentarianListSerializer
        return ParliamentarianDetailSerializer
