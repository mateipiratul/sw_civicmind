from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.test import SimpleTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.profiles.models import Profile
from .filters import ParliamentarianFilterSet
from .serializers import ParliamentarianListSerializer, ParliamentarianVoteMapSerializer
from .views import ParliamentarianViewSet


class ParliamentarianFilterSetTests(SimpleTestCase):
    def test_filter_county_uses_case_insensitive_contains(self):
        queryset = MagicMock()
        queryset.filter.return_value = "filtered-queryset"

        filterset = ParliamentarianFilterSet(data={}, queryset=queryset)
        result = filterset.filter_county(queryset, "county", "  Cluj  ")

        queryset.filter.assert_called_once_with(county__icontains="Cluj")
        self.assertEqual(result, "filtered-queryset")

    def test_filter_party_uses_case_insensitive_exact_match(self):
        queryset = MagicMock()
        queryset.filter.return_value = "filtered-queryset"

        filterset = ParliamentarianFilterSet(data={}, queryset=queryset)
        result = filterset.filter_party(queryset, "party", "  USR  ")

        queryset.filter.assert_called_once_with(party__iexact="USR")
        self.assertEqual(result, "filtered-queryset")

    def test_viewset_uses_parliamentarian_filterset(self):
        self.assertIs(ParliamentarianViewSet.filterset_class, ParliamentarianFilterSet)

    def test_viewset_uses_vote_map_serializer_for_vote_map_action(self):
        view = ParliamentarianViewSet()
        view.action = "vote_map"

        self.assertIs(view.get_serializer_class(), ParliamentarianVoteMapSerializer)

    def test_viewset_uses_list_serializer_for_directory_action(self):
        view = ParliamentarianViewSet()
        view.action = "directory"

        self.assertIs(view.get_serializer_class(), ParliamentarianListSerializer)


class ParliamentarianVoteMapTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        # Create user with profile
        cls.user = User.objects.create_user(username="county-user", password="StrongPass1!")
        Profile.objects.create(user=cls.user, county="Cluj", preferred_party="USR")

        # Create parliamentarians
        cls.mp1 = Parliamentarian.objects.create(mp_slug="mp-1", mp_name="Ion Popescu", chamber="deputies", county="Cluj", party="USR")
        cls.mp2 = Parliamentarian.objects.create(mp_slug="mp-2", mp_name="Ana Ionescu", chamber="deputies", county="Bucuresti", party="PSD")
        cls.mp3 = Parliamentarian.objects.create(mp_slug="mp-3", mp_name="Gheorghe Vasile", chamber="senate", county="Cluj", party="PNL")

    def test_vote_map_returns_paginated_mapped_response(self):
        response = self.client.get(reverse("parliamentarian-vote-map"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["page"], 1)
        self.assertEqual(response.data["limit"], 25)
        self.assertEqual(response.data["voteLimit"], 50) # default is 50, not None
        self.assertEqual(response.data["total"], 2) # only deputies
        self.assertEqual(response.data["totalPages"], 1)
        self.assertEqual(len(response.data["parliamentarians"]), 2)
        
        slugs = [mp["mp_slug"] for mp in response.data["parliamentarians"]]
        self.assertIn("mp-1", slugs)
        self.assertIn("mp-2", slugs)
        self.assertNotIn("mp-3", slugs) # senator

    def test_vote_map_passes_vote_limit_to_serializer_context(self):
        response = self.client.get(reverse("parliamentarian-vote-map"), {"vote_limit": 10})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["voteLimit"], 10)

    def test_directory_returns_paginated_response(self):
        response = self.client.get(reverse("parliamentarian-directory"), {"limit": 1})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["limit"], 1)
        self.assertEqual(response.data["total"], 2) # total deputies
        self.assertEqual(len(response.data["parliamentarians"]), 1)

    def test_metadata_returns_filter_collections(self):
        response = self.client.get(reverse("parliamentarian-metadata"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["counties"], ["Bucuresti", "Cluj"])
        self.assertEqual(response.data["parties"], ["PNL", "PSD", "USR"])
        self.assertEqual(response.data["chambers"]["deputies"], 2)
        self.assertEqual(response.data["chambers"]["senate"], 1)
        self.assertTrue(response.data["hasCountyData"])

    def test_my_representatives_requires_county(self):
        response = self.client.get(reverse("parliamentarian-my-representatives"))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_my_representatives_filters_by_county_and_party(self):
        response = self.client.get(
            reverse("parliamentarian-my-representatives"),
            {"county": "Cluj", "party": "USR", "vote_limit": 5},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["filters"]["county"], "Cluj")
        self.assertEqual(response.data["filters"]["party"], "USR")
        self.assertEqual(response.data["voteLimit"], 5)
        self.assertEqual(len(response.data["parliamentarians"]), 1)
        self.assertEqual(response.data["parliamentarians"][0]["mp_slug"], "mp-1")

    def test_my_representatives_uses_profile_defaults_when_query_missing(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(reverse("parliamentarian-my-representatives"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["filters"]["county"], "Cluj")
        self.assertEqual(response.data["filters"]["party"], "USR")
        self.assertEqual(len(response.data["parliamentarians"]), 1)
        self.assertEqual(response.data["parliamentarians"][0]["mp_slug"], "mp-1")
