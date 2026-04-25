from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

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
