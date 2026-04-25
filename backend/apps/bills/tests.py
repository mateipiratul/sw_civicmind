from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.test import SimpleTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.profiles.models import Profile
from .filters import BillFilterSet
from .views import BillViewSet


class FeedTests(APITestCase):
    @patch("apps.bills.views.BillViewSet.filter_queryset")
    @patch("apps.bills.views.BillViewSet.get_queryset")
    def test_feed_unauthenticated(self, mock_get_queryset, mock_filter_queryset):
        base_queryset = MagicMock()
        recent_queryset = MagicMock()
        recent_queryset.exists.return_value = False
        base_queryset.filter.return_value.order_by.return_value = recent_queryset
        base_queryset.order_by.return_value.__getitem__.return_value = []
        mock_get_queryset.return_value = base_queryset
        mock_filter_queryset.return_value = base_queryset

        url = reverse("bill-feed")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    @patch("apps.bills.views.ParliamentarianVoteMapSerializer")
    @patch("apps.bills.views.BillListSerializer")
    @patch("apps.bills.views.BillViewSet._get_representatives_queryset")
    @patch("apps.bills.views.BillViewSet.filter_queryset")
    @patch("apps.bills.views.BillViewSet.get_queryset")
    def test_personalized_returns_bills_and_my_representatives(
        self,
        mock_get_queryset,
        mock_filter_queryset,
        mock_get_representatives_queryset,
        mock_bill_serializer,
        mock_representative_serializer,
    ):
        user = User.objects.create_user(username="feed-user", password="StrongPass1!")
        Profile.objects.create(
            user=user,
            county="Cluj",
            preferred_party="USR",
            interests=["it"],
            persona_tags=["student"],
            questionnaire_completed=True,
        )
        self.client.force_authenticate(user)

        base_queryset = MagicMock()
        filtered_queryset = MagicMock()
        paged_bills = [MagicMock()]
        mock_get_queryset.return_value = base_queryset
        mock_filter_queryset.return_value = base_queryset
        base_queryset.filter.return_value.distinct.return_value = filtered_queryset
        filtered_queryset.count.return_value = 1
        filtered_queryset.__getitem__.return_value = paged_bills

        bill_serializer = MagicMock()
        bill_serializer.data = [{"idp": 1, "bill_number": "PL-x 1/2026"}]
        mock_bill_serializer.return_value = bill_serializer

        representatives_queryset = MagicMock()
        representatives_queryset.count.return_value = 1
        representatives_queryset.__getitem__.return_value = [MagicMock()]
        mock_get_representatives_queryset.return_value = representatives_queryset

        representative_serializer = MagicMock()
        representative_serializer.data = [{"mp_slug": "mp-1"}]
        mock_representative_serializer.return_value = representative_serializer

        response = self.client.get(reverse("bill-personalized"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["profile"]["county"], "Cluj")
        self.assertEqual(response.data["profile"]["preferredParty"], "USR")
        self.assertEqual(response.data["appliedFilters"]["impactCategories"], ["it"])
        self.assertEqual(response.data["appliedFilters"]["affectedProfiles"], ["student"])
        self.assertEqual(response.data["bills"], [{"idp": 1, "bill_number": "PL-x 1/2026"}])
        self.assertEqual(response.data["myRepresentatives"]["parliamentarians"], [{"mp_slug": "mp-1"}])


class BillFilterSetTests(SimpleTestCase):
    def test_category_variants_normalize_case_and_spacing(self):
        variants = BillFilterSet._category_variants("  it  sector ")

        self.assertEqual(variants, ["it sector", "IT SECTOR", "It Sector"])

    def test_filter_category_queries_ai_analysis_impact_categories(self):
        queryset = MagicMock()
        filtered_queryset = MagicMock()
        queryset.filter.return_value = filtered_queryset
        filtered_queryset.distinct.return_value = "final-queryset"

        filterset = BillFilterSet(data={}, queryset=queryset)
        result = filterset.filter_category(queryset, "category", "it")

        query = queryset.filter.call_args.args[0]
        self.assertEqual(query.connector, "OR")
        self.assertEqual(
            query.children,
            [
                ("ai_analysis__impact_categories__contains", ["it"]),
                ("ai_analysis__impact_categories__contains", ["IT"]),
                ("ai_analysis__impact_categories__contains", ["It"]),
            ],
        )
        self.assertEqual(result, "final-queryset")

    def test_viewset_uses_bill_filterset(self):
        self.assertIs(BillViewSet.filterset_class, BillFilterSet)
