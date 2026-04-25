from django.conf import settings
from django.db import models


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    county = models.CharField(max_length=100, blank=True, null=True)
    preferred_party = models.CharField(max_length=100, blank=True, null=True)
    interests = models.JSONField(default=list, blank=True)
    persona_tags = models.JSONField(default=list, blank=True)
    work_domain = models.CharField(max_length=100, blank=True, null=True)
    employment_status = models.CharField(max_length=100, blank=True, null=True)
    personal_interest_areas = models.JSONField(default=list, blank=True)
    age_range = models.CharField(max_length=50, blank=True, null=True)
    housing_status = models.CharField(max_length=100, blank=True, null=True)
    mobility_modes = models.JSONField(default=list, blank=True)
    education_context = models.JSONField(default=list, blank=True)
    energy_focus = models.JSONField(default=list, blank=True)
    public_service_focus = models.JSONField(default=list, blank=True)
    questionnaire_completed = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.user.username}'s Profile"
