import os
from django.conf import settings
from rest_framework import permissions
from rest_framework.response import Response
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework.views import APIView

@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfTokenView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        # ensure_csrf_cookie will set the CSRF cookie on the response
        return Response({"detail": "CSRF cookie set"})

class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    # Allow configuring the callback URL via settings for production vs local
    callback_url = getattr(settings, 'GOOGLE_OAUTH_CALLBACK_URL', 'http://localhost:5173/auth/callback')
    client_class = OAuth2Client
