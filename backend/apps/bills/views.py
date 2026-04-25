from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Bill
from .serializers import BillListSerializer, BillDetailSerializer

class BillViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Bill.objects.all().order_by('-registered_at')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'bill_number', 'initiator_name']

    def get_serializer_class(self):
        if self.action == 'list':
            return BillListSerializer
        return BillDetailSerializer

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def feed(self, request):
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        # Get bills from the past 7 days based on registered_at
        past_week = timezone.now().date() - timedelta(days=7)
        queryset = self.get_queryset().filter(registered_at__gte=past_week).order_by('-registered_at')
        
        # Fallback: If no bills are found in the past week, just show the 10 most recent
        if not queryset.exists():
            queryset = self.get_queryset().order_by('-registered_at')[:10]
        
        if request.user.is_authenticated:
            # TODO: Prioritise based on user preferences later
            pass
            
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def personalized(self, request):
        user_interests = getattr(request.user.profile, 'interests', [])
        
        if not user_interests:
            return Response({"results": []})

        from django.db.models import Q
        
        query = Q()
        for interest in user_interests:
            query |= Q(ai_analysis__impact_categories__contains=[interest])
        
        queryset = self.get_queryset().filter(query)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = BillListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = BillListSerializer(queryset, many=True)
        return Response(serializer.data)
