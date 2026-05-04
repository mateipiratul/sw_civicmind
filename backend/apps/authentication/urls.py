from django.urls import path
from .views import RegisterView, LoginView, GoogleLogin, CsrfTokenView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('csrf/', CsrfTokenView.as_view(), name='csrf'),
    path('google/', GoogleLogin.as_view(), name='google_login'),
]
