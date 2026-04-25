from django.contrib import admin
from .models import Profile

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'county', 'work_domain', 'employment_status', 'questionnaire_completed')
    search_fields = ('user__username', 'user__email', 'county')
    list_filter = ('county', 'questionnaire_completed', 'work_domain', 'employment_status')
