from __future__ import annotations

from django.db.models import Q, QuerySet
from django_filters import rest_framework as filters

from .models import Bill


class BillFilterSet(filters.FilterSet):
    status = filters.CharFilter(field_name="status", lookup_expr="iexact")
    category = filters.CharFilter(method="filter_category")
    impact_category = filters.CharFilter(method="filter_category")

    class Meta:
        model = Bill
        fields = ["status", "category", "impact_category"]

    def filter_category(self, queryset: QuerySet, name: str, value: str) -> QuerySet:
        normalized_values = self._category_variants(value)
        if not normalized_values:
            return queryset

        conditions = [
            Q(ai_analysis__impact_categories__contains=[item])
            for item in normalized_values
        ]
        query = conditions[0]
        for condition in conditions[1:]:
            query |= condition

        return queryset.filter(query).distinct()

    @staticmethod
    def _category_variants(value: str) -> list[str]:
        normalized = " ".join((value or "").split())
        if not normalized:
            return []

        variants = [
            normalized,
            normalized.lower(),
            normalized.upper(),
            normalized.title(),
        ]

        seen: set[str] = set()
        deduped: list[str] = []
        for item in variants:
            if item not in seen:
                seen.add(item)
                deduped.append(item)
        return deduped
