from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .filters import ParliamentarianFilterSet
from .serializers import ParliamentarianVoteMapSerializer
from .views import ParliamentarianViewSet


class ParliamentarianFilterSetTests(SimpleTestCase):
    def test_filter_county_uses_case_insensitive_contains(self):
        queryset = MagicMock()
        queryset.filter.return_value = "filtered-queryset"

        filterset = ParliamentarianFilterSet(data={}, queryset=queryset)
        result = filterset.filter_county(queryset, "county", "  Cluj  ")

        queryset.filter.assert_called_once_with(county__icontains="Cluj")
        self.assertEqual(result, "filtered-queryset")

    def test_viewset_uses_parliamentarian_filterset(self):
        self.assertIs(ParliamentarianViewSet.filterset_class, ParliamentarianFilterSet)

    def test_viewset_uses_vote_map_serializer_for_vote_map_action(self):
        view = ParliamentarianViewSet()
        view.action = "vote_map"

        self.assertIs(view.get_serializer_class(), ParliamentarianVoteMapSerializer)


class ParliamentarianVoteMapTests(APITestCase):
    @patch("apps.parliamentarians.views.ParliamentarianViewSet.get_serializer")
    @patch("apps.parliamentarians.views.ParliamentarianViewSet.filter_queryset")
    @patch("apps.parliamentarians.views.ParliamentarianViewSet.get_queryset")
    def test_vote_map_returns_paginated_mapped_response(
        self,
        mock_get_queryset,
        mock_filter_queryset,
        mock_get_serializer,
    ):
        base_queryset = MagicMock()
        chamber_queryset = MagicMock()
        ordered_queryset = MagicMock()
        paged_items = [MagicMock(), MagicMock()]

        mock_get_queryset.return_value = base_queryset
        mock_filter_queryset.return_value = base_queryset
        base_queryset.filter.return_value = chamber_queryset
        chamber_queryset.order_by.return_value = ordered_queryset
        ordered_queryset.count.return_value = 2
        ordered_queryset.__getitem__.return_value = paged_items

        serializer = MagicMock()
        serializer.data = [
            {"mp_slug": "mp-1", "votes": []},
            {"mp_slug": "mp-2", "votes": []},
        ]
        mock_get_serializer.return_value = serializer

        response = self.client.get(reverse("parliamentarian-vote-map"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["page"], 1)
        self.assertEqual(response.data["limit"], 25)
        self.assertEqual(response.data["voteLimit"], None)
        self.assertEqual(response.data["total"], 2)
        self.assertEqual(response.data["totalPages"], 1)
        self.assertEqual(len(response.data["parliamentarians"]), 2)
        base_queryset.filter.assert_called_once_with(chamber__icontains="deput")

    @patch("apps.parliamentarians.views.ParliamentarianViewSet.get_serializer")
    @patch("apps.parliamentarians.views.ParliamentarianViewSet.filter_queryset")
    @patch("apps.parliamentarians.views.ParliamentarianViewSet.get_queryset")
    def test_vote_map_passes_vote_limit_to_serializer_context(
        self,
        mock_get_queryset,
        mock_filter_queryset,
        mock_get_serializer,
    ):
        base_queryset = MagicMock()
        chamber_queryset = MagicMock()
        ordered_queryset = MagicMock()

        mock_get_queryset.return_value = base_queryset
        mock_filter_queryset.return_value = base_queryset
        base_queryset.filter.return_value = chamber_queryset
        chamber_queryset.order_by.return_value = ordered_queryset
        ordered_queryset.count.return_value = 0
        ordered_queryset.__getitem__.return_value = []

        serializer = MagicMock()
        serializer.data = []
        mock_get_serializer.return_value = serializer

        response = self.client.get(reverse("parliamentarian-vote-map"), {"vote_limit": 10})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        _, kwargs = mock_get_serializer.call_args
        self.assertEqual(kwargs["context"]["vote_limit"], 10)
