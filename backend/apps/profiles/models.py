from django.conf import settings
from django.db import models
from django.db.models.signals import pre_save
from django.dispatch import receiver
from typing import Any

from .questionnaire import (
    derive_persona_tags,
    derive_profile_interests,
    is_questionnaire_completed,
)


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

    def update_derived_fields(self):
        # Convert model instance to a dict for the derivation functions
        data = {
            "county": self.county,
            "work_domain": self.work_domain,
            "employment_status": self.employment_status,
            "personal_interest_areas": self.personal_interest_areas,
            "age_range": self.age_range,
            "housing_status": self.housing_status,
            "mobility_modes": self.mobility_modes,
            "education_context": self.education_context,
            "energy_focus": self.energy_focus,
            "public_service_focus": self.public_service_focus,
            "interests": self.interests,
            "persona_tags": self.persona_tags,
        }
        
        self.interests = derive_profile_interests(data)
        self.persona_tags = derive_persona_tags(data)
        self.questionnaire_completed = is_questionnaire_completed(data)


@receiver(pre_save, sender=Profile)
def profile_pre_save(sender: Any, instance: Profile, **kwargs: Any):
    instance.update_derived_fields()
