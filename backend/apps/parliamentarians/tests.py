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

    @patch("apps.parliamentarians.views.ParliamentarianViewSet.get_serializer")
    @patch("apps.parliamentarians.views.ParliamentarianViewSet.filter_queryset")
    @patch("apps.parliamentarians.views.ParliamentarianViewSet.get_queryset")
    def test_directory_returns_paginated_response(
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
        ordered_queryset.count.return_value = 1
        ordered_queryset.__getitem__.return_value = [MagicMock()]

        serializer = MagicMock()
        serializer.data = [{"mp_slug": "mp-1"}]
        mock_get_serializer.return_value = serializer

        response = self.client.get(reverse("parliamentarian-directory"), {"limit": 10})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["limit"], 10)
        self.assertEqual(response.data["total"], 1)
        self.assertEqual(response.data["parliamentarians"], [{"mp_slug": "mp-1"}])

    @patch("apps.parliamentarians.views.Parliamentarian.objects")
    def test_metadata_returns_filter_collections(self, mock_manager):
        deputies = MagicMock()
        mock_manager.filter.return_value = deputies
        deputies.exclude.return_value.exclude.return_value.values_list.return_value.distinct.side_effect = [
            ["Cluj", "Alba"],
            ["USR", "PSD"],
        ]
        mock_manager.values_list.return_value = ["deputies", "deputies", "senate"]

        response = self.client.get(reverse("parliamentarian-metadata"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["counties"], ["Alba", "Cluj"])
        self.assertEqual(response.data["parties"], ["PSD", "USR"])
        self.assertEqual(response.data["chambers"]["deputies"], 2)

    @patch("apps.parliamentarians.views.ParliamentarianVoteMapSerializer")
    @patch("apps.parliamentarians.views.ParliamentarianViewSet.filter_queryset")
    @patch("apps.parliamentarians.views.ParliamentarianViewSet.get_queryset")
    def test_my_representatives_requires_county(
        self,
        mock_get_queryset,
        mock_filter_queryset,
        mock_serializer,
    ):
        response = self.client.get(reverse("parliamentarian-my-representatives"))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)
        mock_get_queryset.assert_not_called()
        mock_filter_queryset.assert_not_called()
        mock_serializer.assert_not_called()

    @patch("apps.parliamentarians.views.ParliamentarianVoteMapSerializer")
    @patch("apps.parliamentarians.views.ParliamentarianViewSet.filter_queryset")
    @patch("apps.parliamentarians.views.ParliamentarianViewSet.get_queryset")
    def test_my_representatives_filters_by_county_and_party(
        self,
        mock_get_queryset,
        mock_filter_queryset,
        mock_serializer,
    ):
        base_queryset = MagicMock()
        chamber_queryset = MagicMock()
        ordered_queryset = MagicMock()
        county_queryset = MagicMock()
        party_queryset = MagicMock()
        paged_items = [MagicMock()]

        mock_get_queryset.return_value = base_queryset
        mock_filter_queryset.return_value = base_queryset
        base_queryset.filter.return_value = chamber_queryset
        chamber_queryset.order_by.return_value = ordered_queryset
        ordered_queryset.filter.return_value = county_queryset
        county_queryset.filter.return_value = party_queryset
        party_queryset.count.return_value = 1
        party_queryset.__getitem__.return_value = paged_items

        serializer = MagicMock()
        serializer.data = [{"mp_slug": "mp-1", "votes": []}]
        mock_serializer.return_value = serializer

        response = self.client.get(
            reverse("parliamentarian-my-representatives"),
            {"county": "Cluj", "party": "USR", "vote_limit": 5},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["filters"]["county"], "Cluj")
        self.assertEqual(response.data["filters"]["party"], "USR")
        self.assertEqual(response.data["voteLimit"], 5)
        self.assertEqual(response.data["parliamentarians"], [{"mp_slug": "mp-1", "votes": []}])
        ordered_queryset.filter.assert_called_once_with(county__icontains="Cluj")
        county_queryset.filter.assert_called_once_with(party__iexact="USR")

    @patch("apps.parliamentarians.views.ParliamentarianVoteMapSerializer")
    @patch("apps.parliamentarians.views.ParliamentarianViewSet.filter_queryset")
    @patch("apps.parliamentarians.views.ParliamentarianViewSet.get_queryset")
    def test_my_representatives_uses_profile_defaults_when_query_missing(
        self,
        mock_get_queryset,
        mock_filter_queryset,
        mock_serializer,
    ):
        user = User.objects.create_user(username="county-user", password="StrongPass1!")
        Profile.objects.create(user=user, county="Cluj", preferred_party="USR")
        self.client.force_authenticate(user)

        base_queryset = MagicMock()
        chamber_queryset = MagicMock()
        ordered_queryset = MagicMock()
        county_queryset = MagicMock()
        party_queryset = MagicMock()

        mock_get_queryset.return_value = base_queryset
        mock_filter_queryset.return_value = base_queryset
        base_queryset.filter.return_value = chamber_queryset
        chamber_queryset.order_by.return_value = ordered_queryset
        ordered_queryset.filter.return_value = county_queryset
        county_queryset.filter.return_value = party_queryset
        party_queryset.count.return_value = 0
        party_queryset.__getitem__.return_value = []

        serializer = MagicMock()
        serializer.data = []
        mock_serializer.return_value = serializer

        response = self.client.get(reverse("parliamentarian-my-representatives"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["filters"]["county"], "Cluj")
        self.assertEqual(response.data["filters"]["party"], "USR")
        ordered_queryset.filter.assert_called_once_with(county__icontains="Cluj")
        county_queryset.filter.assert_called_once_with(party__iexact="USR")
