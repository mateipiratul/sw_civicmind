from unittest.mock import MagicMock

from django.test import SimpleTestCase

from .filters import ParliamentarianFilterSet
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
