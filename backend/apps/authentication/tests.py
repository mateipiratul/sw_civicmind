from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class AuthenticationValidationTests(APITestCase):
    def test_register_sanitizes_username_and_email(self):
        response = self.client.post(
            reverse("register"),
            {
                "username": "  Matei.User  ",
                "email": "  Matei.User@Example.COM  ",
                "password1": "StrongPass1!",
                "password2": "StrongPass1!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username="Matei.User")
        self.assertEqual(user.email, "matei.user@example.com")

    def test_register_rejects_invalid_email_regex(self):
        response = self.client.post(
            reverse("register"),
            {
                "username": "valid-user",
                "email": "bad..email@example..com",
                "password1": "StrongPass1!",
                "password2": "StrongPass1!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_register_rejects_weak_password_without_uppercase(self):
        response = self.client.post(
            reverse("register"),
            {
                "username": "another-user",
                "email": "another@example.com",
                "password1": "weakpass1!",
                "password2": "weakpass1!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password1", response.data)

    def test_register_rejects_password_without_special_character(self):
        response = self.client.post(
            reverse("register"),
            {
                "username": "third-user",
                "email": "third@example.com",
                "password1": "StrongPass1",
                "password2": "StrongPass1",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password1", response.data)

    def test_login_accepts_username_with_surrounding_spaces(self):
        user = User.objects.create_user(
            username="clean-user",
            email="clean@example.com",
            password="StrongPass1!",
        )

        response = self.client.post(
            reverse("login"),
            {"username": "  clean-user  ", "password": "StrongPass1!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("key", response.data)
