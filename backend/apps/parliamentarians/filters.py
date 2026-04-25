from __future__ import annotations

from django.db.models import QuerySet
from django_filters import rest_framework as filters

from .models import Parliamentarian


class ParliamentarianFilterSet(filters.FilterSet):
    county = filters.CharFilter(method="filter_county")

    class Meta:
        model = Parliamentarian
        fields = ["county"]

    def filter_county(self, queryset: QuerySet, name: str, value: str) -> QuerySet:
        normalized = " ".join((value or "").split())
        if not normalized:
            return queryset
        return queryset.filter(county__icontains=normalized)
