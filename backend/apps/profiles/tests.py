from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Profile


class ProfileModelTest(APITestCase):
    def test_profile_str_method(self):
        user = User.objects.create_user(username="matei", password="test12345")
        profile = Profile.objects.create(user=user)

        self.assertEqual(str(profile), "matei's Profile")

    def test_register_serializer_flow_creates_profile(self):
        response = self.client.post(
            reverse("register"),
            {
                "username": "ana",
                "email": "ana@example.com",
                "password": "pass12345",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Profile.objects.filter(user__username="ana").exists())


class ProfileViewSetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="profile-user",
            email="profile@example.com",
            password="pass12345",
        )
        self.client.force_authenticate(self.user)

    def test_me_returns_current_user_profile(self):
        response = self.client.get(reverse("profile-me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "profile-user")
        self.assertEqual(response.data["county"], None)

    def test_me_patch_updates_questionnaire_and_derives_tags(self):
        response = self.client.patch(
            reverse("profile-me"),
            {
                "county": "Cluj",
                "work_domain": "it",
                "employment_status": "freelancer_pfa",
                "personal_interest_areas": ["digitalization", "taxes"],
                "age_range": "25_34",
                "housing_status": "rent",
                "mobility_modes": ["public_transport"],
                "education_context": ["parent_of_student"],
                "energy_focus": ["electricity"],
                "public_service_focus": ["documents_digital", "public_healthcare"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["county"], "Cluj")
        self.assertEqual(response.data["work_domain"], "it")
        self.assertIn("it", response.data["interests"])
        self.assertIn("fiscal", response.data["interests"])
        self.assertIn("administratie", response.data["interests"])
        self.assertIn("pfa", response.data["persona_tags"])
        self.assertIn("it", response.data["persona_tags"])
        self.assertTrue(response.data["questionnaire_completed"])

    def test_questionnaire_metadata_endpoint_returns_form_options(self):
        response = self.client.get(reverse("profile-questionnaire"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("work_domains", response.data)
        self.assertIn("employment_statuses", response.data)
        self.assertIn("personal_interest_areas", response.data)
        self.assertGreater(len(response.data["work_domains"]), 0)

    def test_me_rejects_invalid_questionnaire_values(self):
        response = self.client.patch(
            reverse("profile-me"),
            {"work_domain": "unknown-domain"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("work_domain", response.data)
