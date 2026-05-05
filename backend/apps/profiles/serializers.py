from __future__ import annotations

from django.db.utils import OperationalError, ProgrammingError
from typing import Dict, List, Optional, Union
from rest_framework import serializers

from .models import Profile
from .questionnaire import (
    PROFILE_QUESTIONNAIRE,
    VALID_MULTI_VALUE_FIELDS,
    VALID_SINGLE_VALUE_FIELDS,
    derive_persona_tags,
    derive_profile_interests,
    is_questionnaire_completed,
)


class ProfileSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    county = serializers.CharField(required=False, allow_null=True)
    preferred_party = serializers.CharField(required=False, allow_null=True)
    interests = serializers.ListField(child=serializers.CharField(), required=False)
    persona_tags = serializers.ListField(child=serializers.CharField(), required=False)
    work_domain = serializers.CharField(required=False, allow_null=True)
    employment_status = serializers.CharField(required=False, allow_null=True)
    personal_interest_areas = serializers.ListField(child=serializers.CharField(), required=False)
    age_range = serializers.CharField(required=False, allow_null=True)
    housing_status = serializers.CharField(required=False, allow_null=True)
    mobility_modes = serializers.ListField(child=serializers.CharField(), required=False)
    education_context = serializers.ListField(child=serializers.CharField(), required=False)
    energy_focus = serializers.ListField(child=serializers.CharField(), required=False)
    public_service_focus = serializers.ListField(child=serializers.CharField(), required=False)
    questionnaire_completed = serializers.BooleanField(required=False)

    def validate(self, attrs: Dict[str, Union[str, List[str], bool, None]]) -> Dict[str, Union[str, List[str], bool, None]]:
        preferred_party = attrs.get("preferred_party")
        if isinstance(preferred_party, str):
            attrs["preferred_party"] = preferred_party.strip() or None

        for field_name, allowed_values in VALID_SINGLE_VALUE_FIELDS.items():
            value = attrs.get(field_name)
            if isinstance(value, str) and value not in allowed_values:
                raise serializers.ValidationError({field_name: "Invalid option selected."})

        for field_name, allowed_values in VALID_MULTI_VALUE_FIELDS.items():
            value = attrs.get(field_name)
            if value is None:
                continue
            if not isinstance(value, list):
                raise serializers.ValidationError({field_name: "This field must be a list."})
            invalid_values = [item for item in value if item not in allowed_values]
            if invalid_values:
                raise serializers.ValidationError({field_name: "Invalid option selected."})

        interests = attrs.get("interests")
        if interests is not None and not isinstance(interests, list):
            raise serializers.ValidationError({"interests": "This field must be a list."})

        persona_tags = attrs.get("persona_tags")
        if persona_tags is not None and not isinstance(persona_tags, list):
            raise serializers.ValidationError({"persona_tags": "This field must be a list."})

        return attrs

    def create(self, validated_data: Dict[str, Union[str, List[str], bool, None]]) -> Profile:
        prepared_data = self._prepare_profile_data(validated_data)
        return Profile.objects.create(**prepared_data)

    def update(self, instance: Profile, validated_data: Dict[str, Union[str, List[str], bool, None]]) -> Profile:
        prepared_data = self._prepare_profile_data(validated_data, instance=instance)
        for attr, value in prepared_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

    def _prepare_profile_data(self, validated_data: Dict[str, Union[str, List[str], bool, None]], instance: Profile | None = None) -> Dict[str, Union[str, List[str], bool, None]]:
        profile_data = self._merge_with_existing(instance, validated_data)

        validated_data["interests"] = derive_profile_interests(profile_data)
        validated_data["persona_tags"] = derive_persona_tags(profile_data)

        if "questionnaire_completed" not in validated_data:
            validated_data["questionnaire_completed"] = is_questionnaire_completed(profile_data)

        return validated_data

    @staticmethod
    def _merge_with_existing(instance: Profile | None, validated_data: Dict[str, Union[str, List[str], bool, None]]) -> Dict[str, Union[str, List[str], bool, None]]:
        base_data: Dict[str, Union[str, List[str], bool, None]] = {
            "county": getattr(instance, "county", None),
            "preferred_party": getattr(instance, "preferred_party", None),
            "interests": list(getattr(instance, "interests", [])),
            "persona_tags": list(getattr(instance, "persona_tags", [])),
            "work_domain": getattr(instance, "work_domain", None),
            "employment_status": getattr(instance, "employment_status", None),
            "personal_interest_areas": list(getattr(instance, "personal_interest_areas", [])),
            "age_range": getattr(instance, "age_range", None),
            "housing_status": getattr(instance, "housing_status", None),
            "mobility_modes": list(getattr(instance, "mobility_modes", [])),
            "education_context": list(getattr(instance, "education_context", [])),
            "energy_focus": list(getattr(instance, "energy_focus", [])),
            "public_service_focus": list(getattr(instance, "public_service_focus", [])),
        }
        base_data.update(validated_data)
        return base_data


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
        from apps.parliamentarians.models import Parliamentarian

        try:
            parties = (
                Parliamentarian.objects
                .filter(chamber__icontains="deput")
                .exclude(party__isnull=True)
                .exclude(party="")
                .values_list("party", flat=True)
                .distinct()
            )
            return [{"value": party, "label": party} for party in sorted(parties)]
        except (OperationalError, ProgrammingError):
            return []

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
