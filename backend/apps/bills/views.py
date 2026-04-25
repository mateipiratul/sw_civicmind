from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from .models import Bill, AIAnalysis, VoteSession
from apps.parliamentarians.models import Parliamentarian
from .serializers import BillListSerializer, BillDetailSerializer

class BillViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Bill.objects.all().order_by('-registered_at')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'bill_number', 'initiator_name']

    def get_serializer_class(self):
        if getattr(self, 'action', None) in ('list', 'feed', 'personalized'):
            return BillListSerializer
        return BillDetailSerializer

    def get_queryset(self):
        qs = Bill.objects.all().order_by('-registered_at')
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs

    def list(self, request, *args, **kwargs):
        """Return paginated bills in the shape the frontend expects."""
        try:
            page = max(1, int(request.query_params.get('page', 1)))
        except (ValueError, TypeError):
            page = 1
        try:
            limit = max(1, min(100, int(request.query_params.get('limit', 20))))
        except (ValueError, TypeError):
            limit = 20

        queryset = self.get_queryset()
        total = queryset.count()
        offset = (page - 1) * limit
        bills = queryset[offset:offset + limit]
        serializer = BillListSerializer(bills, many=True)
        import math
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
        queryset = self.get_queryset().filter(registered_at__gte=past_week).order_by('-registered_at')
        
        if not queryset.exists():
            queryset = self.get_queryset().order_by('-registered_at')[:10]
        
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
