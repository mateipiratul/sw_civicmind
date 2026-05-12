from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import authenticate
from .models import Profile
from .serializers import ProfileSerializer, ProfileQuestionnaireSerializer

class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users can only see their own profile
        return Profile.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get', 'put', 'patch', 'delete'])
    def me(self, request):
        profile, created = Profile.objects.get_or_create(user=request.user)
        if request.method == 'GET':
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        
        if request.method == 'DELETE':
            password = request.data.get('password', '')
            if not password:
                return Response({'detail': 'Parola este necesară pentru ștergerea contului.'}, status=status.HTTP_400_BAD_REQUEST)
            user = request.user
            verified = authenticate(username=user.username, password=password)
            if not verified:
                return Response({'detail': 'Parolă incorectă. Contul nu a fost șters.'}, status=status.HTTP_400_BAD_REQUEST)
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        serializer = self.get_serializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def questionnaire(self, request):
        serializer = ProfileQuestionnaireSerializer(instance={})
        return Response(serializer.data)
