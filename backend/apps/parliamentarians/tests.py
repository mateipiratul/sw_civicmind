from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.profiles.models import Profile
from apps.bills.models import Bill
from .models import Parliamentarian, MPVote, VoteSession
from .filters import ParliamentarianFilterSet
from .serializers import ParliamentarianListSerializer, ParliamentarianVoteMapSerializer
from .views import ParliamentarianViewSet


class ParliamentarianFilterSetTests(TestCase):
    def setUp(self):
        # Create parliamentarians
        self.mp1 = Parliamentarian.objects.create(
            mp_slug="mp-1", mp_name="Ion Popescu", chamber="deputies", county="Cluj", party="USR"
        )
        self.mp2 = Parliamentarian.objects.create(
            mp_slug="mp-2", mp_name="Ana Ionescu", chamber="deputies", county="Bucuresti", party="PSD"
        )
        self.mp3 = Parliamentarian.objects.create(
            mp_slug="mp-3", mp_name="Gheorghe Vasile", chamber="senate", county="Cluj", party="PNL"
        )

    def test_filter_county_uses_case_insensitive_contains(self):
        queryset = Parliamentarian.objects.all()
        filterset = ParliamentarianFilterSet(data={}, queryset=queryset)
        
        # Test exact match with spacing
        result = filterset.filter_county(queryset, "county", "  Cluj  ")
        self.assertEqual(result.count(), 2)
        self.assertIn(self.mp1, result)
        self.assertIn(self.mp3, result)
        self.assertNotIn(self.mp2, result)

        # Test case insensitivity
        result = filterset.filter_county(queryset, "county", "cluj")
        self.assertEqual(result.count(), 2)

    def test_filter_party_uses_case_insensitive_exact_match(self):
        queryset = Parliamentarian.objects.all()
        filterset = ParliamentarianFilterSet(data={}, queryset=queryset)

        # Test exact match with spacing
        result = filterset.filter_party(queryset, "party", "  USR  ")
        self.assertEqual(result.count(), 1)
        self.assertIn(self.mp1, result)

        # Test case insensitivity
        result = filterset.filter_party(queryset, "party", "usr")
        self.assertEqual(result.count(), 1)

    def test_filter_bill_ids(self):
        queryset = Parliamentarian.objects.all()
        filterset = ParliamentarianFilterSet(data={}, queryset=queryset)

        # Create bill, session, vote
        bill = Bill.objects.create(idp=10, bill_number="PL-x 10/2026", title="Test Bill")
        session = VoteSession.objects.create(idv=10, bill=bill, type="final")
        MPVote.objects.create(parliamentarian=self.mp1, vote_session=session, vote="PENTRU", party="USR")

        result = filterset.filter_bill_ids(queryset, "bill_ids", "10")
        self.assertEqual(result.count(), 1)
        self.assertIn(self.mp1, result)
        self.assertNotIn(self.mp2, result)

    def test_filter_bill_numbers(self):
        queryset = Parliamentarian.objects.all()
        filterset = ParliamentarianFilterSet(data={}, queryset=queryset)

        # Create bill, session, vote
        bill = Bill.objects.create(idp=20, bill_number="PL-x 20/2026", title="Test Bill")
        session = VoteSession.objects.create(idv=20, bill=bill, type="final")
        MPVote.objects.create(parliamentarian=self.mp2, vote_session=session, vote="CONTRA", party="PSD")

        result = filterset.filter_bill_numbers(queryset, "bill_numbers", "PL-x 20/2026")
        self.assertEqual(result.count(), 1)
        self.assertIn(self.mp2, result)
        self.assertNotIn(self.mp1, result)

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
        profile = cls.user.profile
        profile.county = "Cluj"
        profile.preferred_party = "USR"
        profile.save()

        # Create parliamentarians
        cls.mp1 = Parliamentarian.objects.create(mp_slug="mp-1", mp_name="Ion Popescu", chamber="deputies", county="Cluj", party="USR")
        cls.mp2 = Parliamentarian.objects.create(mp_slug="mp-2", mp_name="Ana Ionescu", chamber="deputies", county="Bucuresti", party="PSD")
        cls.mp3 = Parliamentarian.objects.create(mp_slug="mp-3", mp_name="Gheorghe Vasile", chamber="senate", county="Cluj", party="PNL")

    def test_vote_map_returns_paginated_mapped_response(self):
        response = self.client.get(reverse("parliamentarian-vote-map"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["page"], 1)
        self.assertEqual(response.data["limit"], 25)
        self.assertIsNone(response.data["voteLimit"])
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
