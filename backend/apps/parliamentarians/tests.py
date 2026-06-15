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
from .models import ImpactScore


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


class ParliamentarianCleaningTests(APITestCase):
    def test_list_repairs_mojibake_and_dedupes_duplicates(self):
        Parliamentarian.objects.create(
            mp_slug="bende-saandor",
            mp_name="Bende SĂĄndor",
            party="UDMR",
        )
        strong = Parliamentarian.objects.create(
            mp_slug="bende-sandor",
            mp_name="Bende Sándor",
            party="UDMR",
            county="HARGHITA",
            email="bende@cdep.ro",
        )
        ImpactScore.objects.create(
            parliamentarian=strong,
            score=100,
            total_votes=11,
            for_count=11,
            against_count=0,
            abstain_count=0,
            absent_count=0,
            categories_voted=[],
            narrative="Bende SĂĄndor a votat pentru.",
        )
        Parliamentarian.objects.create(
            mp_slug="albu-dumitril-a",
            mp_name="Albu DumitriĹŁa",
            party="Neafiliati",
        )
        Parliamentarian.objects.create(
            mp_slug="albu-dumitrita",
            mp_name="Albu Dumitriţa",
            party="Neafiliati",
            county="DIASPORA",
        )
        Parliamentarian.objects.create(
            mp_slug="barbu-florin-ionul",
            mp_name="Barbu Florin-IonuĹŁ",
            party="PSD",
        )
        Parliamentarian.objects.create(
            mp_slug="barbu-florin-ionut",
            mp_name="Barbu Florin-Ionuţ",
            party="PSD",
            county="OLT",
        )

        response = self.client.get(reverse("parliamentarian-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 3)
        by_slug = {
            item["mp_slug"]: item
            for item in response.data["parliamentarians"]
        }
        self.assertEqual(set(by_slug), {"albu-dumitrita", "barbu-florin-ionut", "bende-sandor"})
        self.assertEqual(by_slug["bende-sandor"]["mp_name"], "Bende Sándor")
        self.assertEqual(by_slug["bende-sandor"]["county"], "HARGHITA")
        self.assertEqual(by_slug["albu-dumitrita"]["mp_name"], "Albu Dumitrița")
        self.assertEqual(by_slug["albu-dumitrita"]["county"], "DIASPORA")
        self.assertEqual(by_slug["barbu-florin-ionut"]["mp_name"], "Barbu Florin-Ionuț")
        self.assertEqual(by_slug["barbu-florin-ionut"]["county"], "OLT")
        self.assertEqual(
            by_slug["bende-sandor"]["impact_score"]["narrative"],
            "Bende Sándor a votat pentru.",
        )

    def test_metadata_repairs_counties_and_parties(self):
        Parliamentarian.objects.create(
            mp_slug="biro-bad",
            mp_name="BirĂł RozĂĄlia-Ibolya",
            party="UDMR",
            county="BIHOR",
        )
        Parliamentarian.objects.create(
            mp_slug="biro-good",
            mp_name="Biró Rozália-Ibolya",
            party="UDMR",
            county="BIHOR",
        )

        response = self.client.get(reverse("parliamentarian-metadata"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["counties"], ["BIHOR"])
        self.assertEqual(response.data["parties"], ["UDMR"])


class ParliamentarianImpactScoreFallbackTests(APITestCase):
    def test_list_builds_fallback_impact_score_from_votes(self):
        mp = Parliamentarian.objects.create(
            mp_slug="amet-varol",
            mp_name="Amet Varol",
            party="Minoritati",
        )
        bill_1 = Bill.objects.create(idp=101, bill_number="PL-x 101/2026", title="Test Bill 1")
        bill_2 = Bill.objects.create(idp=102, bill_number="PL-x 102/2026", title="Test Bill 2")
        session_1 = VoteSession.objects.create(idv=101, bill=bill_1, type="final")
        session_2 = VoteSession.objects.create(idv=102, bill=bill_2, type="final")
        MPVote.objects.create(parliamentarian=mp, vote_session=session_1, vote="for", party="Minoritati")
        MPVote.objects.create(parliamentarian=mp, vote_session=session_2, vote="for", party="Minoritati")
        ImpactScore.objects.filter(parliamentarian=mp).delete()

        response = self.client.get(reverse("parliamentarian-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 1)
        item = response.data["parliamentarians"][0]
        self.assertEqual(item["mp_slug"], "amet-varol")
        self.assertEqual(item["impact_score"]["score"], 100.0)
        self.assertEqual(item["impact_score"]["total_votes"], 2)
        self.assertEqual(item["impact_score"]["for_count"], 2)

    def test_detail_builds_fallback_impact_score_from_prefetched_votes(self):
        mp = Parliamentarian.objects.create(
            mp_slug="amet-varol",
            mp_name="Amet Varol",
            party="Minoritati",
        )
        bill = Bill.objects.create(idp=101, bill_number="PL-x 101/2026", title="Test Bill")
        session = VoteSession.objects.create(idv=101, bill=bill, type="final")
        MPVote.objects.create(parliamentarian=mp, vote_session=session, vote="for", party="Minoritati")
        ImpactScore.objects.filter(parliamentarian=mp).delete()

        response = self.client.get(reverse("parliamentarian-detail", kwargs={"pk": "amet-varol"}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["impact_score"]["score"], 100.0)
        self.assertEqual(response.data["impact_score"]["total_votes"], 1)
        self.assertEqual(len(response.data["recent_votes"]), 1)

    def test_vote_signal_persists_score_for_new_votes(self):
        mp = Parliamentarian.objects.create(
            mp_slug="amet-varol",
            mp_name="Amet Varol",
            party="Minoritati",
        )
        bill = Bill.objects.create(idp=101, bill_number="PL-x 101/2026", title="Test Bill")
        session = VoteSession.objects.create(idv=101, bill=bill, type="final")

        MPVote.objects.create(parliamentarian=mp, vote_session=session, vote="for", party="Minoritati")

        impact_score = ImpactScore.objects.get(parliamentarian=mp)
        self.assertEqual(impact_score.score, 100.0)
        self.assertEqual(impact_score.total_votes, 1)

    def test_existing_impact_score_with_null_score_is_completed_in_response(self):
        mp = Parliamentarian.objects.create(
            mp_slug="amet-varol",
            mp_name="Amet Varol",
            party="Minoritati",
        )
        ImpactScore.objects.create(
            parliamentarian=mp,
            score=None,
            total_votes=2,
            for_count=2,
            against_count=0,
            abstain_count=0,
            absent_count=0,
            categories_voted=[],
        )

        response = self.client.get(reverse("parliamentarian-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["parliamentarians"][0]["impact_score"]["score"], 100.0)
