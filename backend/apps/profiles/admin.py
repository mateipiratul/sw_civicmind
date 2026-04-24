from django.contrib import admin
from .models import Profile

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'county', 'interests')
    search_fields = ('user__username', 'user__email', 'county')
    list_filter = ('county',)
