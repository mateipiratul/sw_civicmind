import re

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
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


class UserSerializer(serializers.ModelSerializer):
    class Meta:  # type: ignore[reportIncompatibleVariableOverride]
        model = User  # type: ignore[reportAssignmentType]
        fields = ("id", "username", "email")


class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(max_length=150)
    email = serializers.CharField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta: # type: ignore[reportIncompatibleVariableOverride]
        model = User # type: ignore[reportAssignmentType]
        fields = ("id", "username", "email", "password")

    def validate_username(self, value: str) -> str:
        normalized = normalize_username(value)
        if not normalized:
            raise serializers.ValidationError("Username is required.")
        if not STRICT_USERNAME_RE.fullmatch(normalized):
            raise serializers.ValidationError(
                "Username must be 3-30 characters and contain only letters, numbers, dots, underscores, or hyphens."
            )
        if User.objects.filter(username__iexact=normalized).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return normalized

    def validate_email(self, value: str) -> str:
        normalized = normalize_email(value)
        if not normalized:
            raise serializers.ValidationError("Email is required.")
        if not STRICT_EMAIL_RE.fullmatch(normalized):
            raise serializers.ValidationError("Enter a valid email address.")
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return normalized

    def validate_password(self, value: str) -> str:
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if any(char.isspace() for char in value):
            raise serializers.ValidationError("Password must not contain spaces.")
        if not PASSWORD_UPPER_RE.search(value):
            raise serializers.ValidationError("Password must contain at least 1 uppercase letter.")
        if not PASSWORD_LOWER_RE.search(value):
            raise serializers.ValidationError("Password must contain at least 1 lowercase letter.")
        if not PASSWORD_DIGIT_RE.search(value):
            raise serializers.ValidationError("Password must contain at least 1 digit.")
        if not PASSWORD_SPECIAL_RE.search(value):
            raise serializers.ValidationError("Password must contain at least 1 special character.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        Profile.objects.get_or_create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(trim_whitespace=False)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        username = normalize_username(attrs.get("username", ""))
        password = attrs.get("password", "")

        if not username or not password:
            raise serializers.ValidationError("Username and password are required.")

        user = authenticate(username=username, password=password)
        if user and user.is_active:
            return user
        raise serializers.ValidationError("Incorrect Credentials")
