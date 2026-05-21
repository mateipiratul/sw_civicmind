from __future__ import annotations

import re

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from typing import Dict
from rest_framework import serializers

from apps.profiles.models import Profile


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


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']
        read_only_fields = ['id']

    def validate_username(self, value: str) -> str:
        normalized = normalize_username(value)
        if not normalized:
            raise serializers.ValidationError("Numele de utilizator este necesar.")
        if not STRICT_USERNAME_RE.fullmatch(normalized):
            raise serializers.ValidationError(
                "Numele de utilizator trebuie să aibă între 3 și 30 de caractere și să conțină doar litere, numere, puncte, underscore-uri sau cratime."
            )
        if User.objects.filter(username__iexact=normalized).exists():
            raise serializers.ValidationError("Un utilizator cu acest nume există deja.")
        return normalized

    def validate_email(self, value: str) -> str:
        normalized = normalize_email(value)
        if not normalized:
            raise serializers.ValidationError("Emailul este necesar.")
        if not STRICT_EMAIL_RE.fullmatch(normalized):
            raise serializers.ValidationError("Introduceți o adresă de email validă.")
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("Un utilizator cu acest email există deja.")
        return normalized

    def validate_password(self, value: str) -> str:
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
            
        return value

    def create(self, validated_data: Dict[str, str]) -> User:
        user: User = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        return user

    def save(self, request):
        return super().save()


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
