from __future__ import annotations

from django.db.utils import OperationalError, ProgrammingError
from typing import Dict, List, Union
from rest_framework import serializers

from .models import Profile
from .questionnaire import (
    PROFILE_QUESTIONNAIRE,
    VALID_MULTI_VALUE_FIELDS,
    VALID_SINGLE_VALUE_FIELDS,
)


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Profile
        fields = [
            'id', 'username', 'email', 'county', 'preferred_party', 'interests',
            'persona_tags', 'work_domain', 'employment_status', 'personal_interest_areas',
            'age_range', 'housing_status', 'mobility_modes', 'education_context',
            'energy_focus', 'public_service_focus', 'questionnaire_completed'
        ]
        read_only_fields = [
            'id', 'username', 'email', 'interests', 'persona_tags', 'questionnaire_completed'
        ]

    def validate(self, attrs: Dict[str, Union[str, List[str], bool, None]]) -> Dict[str, Union[str, List[str], bool, None]]:
        preferred_party = attrs.get("preferred_party")
        if isinstance(preferred_party, str):
            attrs["preferred_party"] = preferred_party.strip() or None

        for field_name, allowed_values in VALID_SINGLE_VALUE_FIELDS.items():
            if field_name in attrs:
                value = attrs[field_name]
                if isinstance(value, str) and value not in allowed_values:
                    raise serializers.ValidationError({field_name: "Opțiune invalidă."})

        for field_name, allowed_values in VALID_MULTI_VALUE_FIELDS.items():
            if field_name in attrs:
                value = attrs[field_name]
                if value is None:
                    continue
                if not isinstance(value, list):
                    raise serializers.ValidationError({field_name: "Opțiune invalidă."})
                invalid_values = [item for item in value if item not in allowed_values]
                if invalid_values:
                    raise serializers.ValidationError({field_name: "Opțiune invalidă."})

        return attrs


class ProfileQuestionnaireSerializer(serializers.Serializer):
    county_label = serializers.SerializerMethodField()
    party_label = serializers.SerializerMethodField()
    party_options = serializers.SerializerMethodField()
    work_domains = serializers.SerializerMethodField()
    employment_statuses = serializers.SerializerMethodField()
    personal_interest_areas = serializers.SerializerMethodField()
    age_ranges = serializers.SerializerMethodField()
    housing_statuses = serializers.SerializerMethodField()
    mobility_modes = serializers.SerializerMethodField()
    education_contexts = serializers.SerializerMethodField()
    energy_focus_options = serializers.SerializerMethodField()
    public_service_options = serializers.SerializerMethodField()

    def get_county_label(self, obj: Profile) -> str:
        return "Judet / localitate aproximativa"

    def get_party_label(self, obj: Profile) -> str:
        return "Partidul votat / preferat"

    def get_party_options(self, obj: Profile) -> List[Dict[str, str]]:
        from apps.parliamentarians.services import ParliamentarianService
        return ParliamentarianService.get_party_options()

    def get_work_domains(self, obj: Profile) -> List[Dict[str, str]]:
        return PROFILE_QUESTIONNAIRE["work_domains"]

    def get_employment_statuses(self, obj: Profile) -> List[Dict[str, str]]:
        return PROFILE_QUESTIONNAIRE["employment_statuses"]

    def get_personal_interest_areas(self, obj: Profile) -> List[Dict[str, str]]:
        return PROFILE_QUESTIONNAIRE["personal_interest_areas"]

    def get_age_ranges(self, obj: Profile) -> List[Dict[str, str]]:
        return PROFILE_QUESTIONNAIRE["age_ranges"]

    def get_housing_statuses(self, obj: Profile) -> List[Dict[str, str]]:
        return PROFILE_QUESTIONNAIRE["housing_statuses"]

    def get_mobility_modes(self, obj: Profile) -> List[Dict[str, str]]:
        return PROFILE_QUESTIONNAIRE["mobility_modes"]

    def get_education_contexts(self, obj: Profile) -> List[Dict[str, str]]:
        return PROFILE_QUESTIONNAIRE["education_contexts"]

    def get_energy_focus_options(self, obj: Profile) -> List[Dict[str, str]]:
        return PROFILE_QUESTIONNAIRE["energy_focus_options"]

    def get_public_service_options(self, obj: Profile) -> List[Dict[str, str]]:
        return PROFILE_QUESTIONNAIRE["public_service_options"]
