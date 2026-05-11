from django.urls import path
from .views import RegisterView, LoginView, GoogleLogin, CsrfTokenView
from dj_rest_auth.views import PasswordResetView, PasswordResetConfirmView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('csrf/', CsrfTokenView.as_view(), name='csrf'),
    path('google/', GoogleLogin.as_view(), name='google_login'),
    path('password/reset/', PasswordResetView.as_view(), name='rest_password_reset'),
    path('password/reset/confirm/', PasswordResetConfirmView.as_view(), name='rest_password_reset_confirm'),
]
