"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from apps.bills.views import AdminStatsView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('auth/register', RedirectView.as_view(url='/auth/register/', permanent=False)),
    path('auth/login', RedirectView.as_view(url='/auth/login/', permanent=False)),
    path('auth/google', RedirectView.as_view(url='/auth/google/', permanent=False)),
    path('auth/', include('apps.authentication.urls')),
    path('api/bills', RedirectView.as_view(url='/api/bills/', permanent=False)),
    path('api/mps', RedirectView.as_view(url='/api/mps/', permanent=False)),
    path('api/profiles', RedirectView.as_view(url='/api/profiles/', permanent=False)),
    path('api/admin/stats', RedirectView.as_view(url='/api/admin/stats/', permanent=False)),
    path('api/admin/stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('api/bills/', include('apps.bills.urls')),
    path('api/mps/', include('apps.parliamentarians.urls')),
    path('api/profiles/', include('apps.profiles.urls')),
]
