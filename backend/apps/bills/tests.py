from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from datetime import date, timedelta

from apps.profiles.models import Profile
from .models import Bill, AIAnalysis, ImpactCategory, AffectedProfile
from apps.parliamentarians.models import Parliamentarian, MPVote
from .filters import BillFilterSet
from .views import BillViewSet


class FeedTests(APITestCase):
    def setUp(self):
        # Create some test bills
        self.bill1 = Bill.objects.create(
            idp=1, bill_number="PL-x 1/2026", title="Test Bill 1", 
            registered_at=date.today() - timedelta(days=2)
        )
        self.bill2 = Bill.objects.create(
            idp=2, bill_number="PL-x 2/2026", title="Test Bill 2", 
            registered_at=date.today() - timedelta(days=10)
        )
        
        # Create categories and profiles
        self.cat_it = ImpactCategory.objects.create(name="it", slug="it")
        self.prof_student = AffectedProfile.objects.create(name="student", slug="student")

    def test_feed_returns_recent_bills(self):
        url = reverse("bill-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check that we received results. BillPagination wraps results in 'bills' key.
        results = response.data.get("bills", [])
        self.assertTrue(len(results) >= 1)
        self.assertEqual(results[0]["idp"], self.bill1.idp)

    def test_personalized_returns_bills_and_my_representatives(self):
        user = User.objects.create_user(username="feed-user", password="StrongPass1!")
        profile = user.profile
        profile.county = "Cluj"
        profile.preferred_party = "USR"
        profile.interests = ["it"]
        profile.persona_tags = ["student"]
        profile.questionnaire_completed = True
        profile.save()
        self.client.force_authenticate(user)

        # Create AI Analysis for bill1 to match interests
        analysis = AIAnalysis.objects.create(
            bill=self.bill1,
            title_short="AI Short Title"
        )
        analysis.rel_impact_categories.add(self.cat_it)
        analysis.rel_affected_profiles.add(self.prof_student)

        # Create a parliamentarian in Cluj with USR party
        mp = Parliamentarian.objects.create(
            mp_slug="mp-1", mp_name="Test MP", party="USR", county="Cluj", chamber="deputies"
        )

        response = self.client.get(reverse("bill-personalized"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["profile"]["county"], "Cluj")
        self.assertEqual(response.data["profile"]["preferredParty"], "USR")
        
        # Check bills (bill1 should be a match). Personalized feed pagination uses 'results' (CursorPagination) or 'bills' (fallback)
        bills_data = response.data.get("bills") or response.data.get("results")
        self.assertEqual(len(bills_data), 2)
        self.assertEqual(bills_data[0]["idp"], self.bill1.idp)


class BillFilterSetTests(APITestCase):
    def setUp(self):
        self.cat_it = ImpactCategory.objects.get_or_create(name="it", slug="it")[0]

    def test_category_variants_normalize_case_and_spacing(self):
        variants = BillFilterSet._category_variants("  it  sector ")
        self.assertEqual(variants, ["it sector", "IT SECTOR", "It Sector"])

    def test_filter_category_queries_ai_analysis_impact_categories(self):
        bill = Bill.objects.create(idp=100, bill_number="B100", title="IT Bill")
        analysis = AIAnalysis.objects.create(bill=bill)
        analysis.rel_impact_categories.add(self.cat_it)
        
        Bill.objects.create(idp=101, bill_number="B101", title="Health Bill")

        queryset = Bill.objects.all()
        filterset = BillFilterSet(data={'category': 'it'}, queryset=queryset)
        result = filterset.qs

        self.assertEqual(result.count(), 1)
        self.assertEqual(result[0].idp, 100)

    def test_viewset_uses_bill_filterset(self):
        self.assertIs(BillViewSet.filterset_class, BillFilterSet)
