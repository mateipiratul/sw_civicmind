from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from apps.bills.views import AdminStatsView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/admin/stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('api/bills/', include('apps.bills.urls')),
    path('api/mps/', include('apps.parliamentarians.urls')),
    path('api/profiles/', include('apps.profiles.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
