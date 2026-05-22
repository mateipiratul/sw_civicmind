from __future__ import annotations

import re

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from typing import Dict, Any
from rest_framework import serializers
from dj_rest_auth.registration.serializers import RegisterSerializer as BaseRegisterSerializer
from allauth.account.adapter import get_adapter


STRICT_EMAIL_RE = re.compile(
    r"^(?=.{6,254}$)(?=.{1,64}@)"
    r"[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*"
    r"@"
    r"(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$"
)
STRICT_USERNAME_RE = re.compile(r"^(?=.{3,30}$)[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$")
PASSWORD_UPPER_RE = re.compile(r"[A-Z]")
PASSWORD_LOWER_RE = re.compile(r"[a-z]")
PASSWORD_DIGIT_RE = re.compile(r"\d")
PASSWORD_SPECIAL_RE = re.compile(r"[!@#$%^&*()_\-+=\[\]{}|\\:;\"'<>,.?/`~]")


def normalize_username(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "")).strip()


def normalize_email(value: str) -> str:
    return (value or "").strip().lower()


from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role']
        read_only_fields = ['id', 'role']

    def get_role(self, obj: User) -> str:
        if obj.is_superuser:
            return "admin"
        if obj.is_staff:
            return "staff"
        return "user"


class RegisterSerializer(BaseRegisterSerializer):
    def validate_username(self, value: str) -> str:
        normalized = normalize_username(value)
        if not normalized:
            raise serializers.ValidationError("Numele de utilizator este necesar.")
        if not STRICT_USERNAME_RE.fullmatch(normalized):
            raise serializers.ValidationError(
                "Numele de utilizator trebuie să aibă între 3 și 30 de caractere și să conțină doar litere, numere, puncte, underscore-uri sau cratime."
            )
        
        # Call base validation but handle our custom normalization
        value = super().validate_username(normalized)
        return value

    def validate_email(self, value: str) -> str:
        normalized = normalize_email(value)
        if not normalized:
            raise serializers.ValidationError("Emailul este necesar.")
        if not STRICT_EMAIL_RE.fullmatch(normalized):
            raise serializers.ValidationError("Introduceți o adresă de email validă.")
        
        return super().validate_email(normalized)

    def validate_password1(self, value: str) -> str:
        # Standard custom checks
        if len(value) < 8:
            raise serializers.ValidationError("Parola trebuie să aibă cel puțin 8 caractere.")
        if any(char.isspace() for char in value):
            raise serializers.ValidationError("Parola nu trebuie să conțină spații.")
        if not PASSWORD_UPPER_RE.search(value):
            raise serializers.ValidationError("Parola trebuie să conțină cel puțin o literă mare.")
        if not PASSWORD_LOWER_RE.search(value):
            raise serializers.ValidationError("Parola trebuie să conțină cel puțin o literă mică.")
        if not PASSWORD_DIGIT_RE.search(value):
            raise serializers.ValidationError("Parola trebuie să conțină cel puțin un cifră.")
        if not PASSWORD_SPECIAL_RE.search(value):
            raise serializers.ValidationError("Parola trebuie să conțină cel puțin un caracter special.")
        
        # Django built-in production validators
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
            
        return super().validate_password1(value)

    def get_cleaned_data(self) -> Dict[str, Any]:
        cleaned_data = super().get_cleaned_data()
        cleaned_data['email'] = normalize_email(self.validated_data.get('email', ''))
        cleaned_data['username'] = normalize_username(self.validated_data.get('username', ''))
        return cleaned_data

    def save(self, request: Any) -> User:
        user = super().save(request)
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(trim_whitespace=False)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs: Dict[str, str]) -> Dict[str, str]:
        username_input: str = attrs.get("username", "").strip()
        password: str = attrs.get("password", "")

        if not username_input or not password:
            raise serializers.ValidationError("Numele de utilizator / Emailul și parola sunt necesare.")

        if "@" in username_input:
            user_by_email = User.objects.filter(email__iexact=username_input).first()
            if user_by_email:
                username_input = user_by_email.username
        else:
            username_input = normalize_username(username_input)

        user = authenticate(username=username_input, password=password)
        if isinstance(user, User) and user.is_active:
            attrs['user'] = user
            return attrs
        raise serializers.ValidationError("Nume de utilizator / Email sau parolă incorecte")
