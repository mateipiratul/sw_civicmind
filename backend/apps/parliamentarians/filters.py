from __future__ import annotations

from django.db.models import QuerySet
from django_filters import rest_framework as filters

from .models import Parliamentarian


class ParliamentarianFilterSet(filters.FilterSet):
    county = filters.CharFilter(method="filter_county")
    party = filters.CharFilter(method="filter_party")
    bill_ids = filters.CharFilter(method="filter_bill_ids")
    bill_numbers = filters.CharFilter(method="filter_bill_numbers")

    class Meta:
        model = Parliamentarian
        fields = ["county", "party", "bill_ids", "bill_numbers"]

    def filter_county(self, queryset: QuerySet, name: str, value: str) -> QuerySet:
        normalized = " ".join((value or "").split())
        if not normalized:
            return queryset
        return queryset.filter(county__icontains=normalized)

    def filter_party(self, queryset: QuerySet, name: str, value: str) -> QuerySet:
        normalized = " ".join((value or "").split())
        if not normalized:
            return queryset
        return queryset.filter(party__iexact=normalized)

    def filter_bill_ids(self, queryset: QuerySet, name: str, value: str) -> QuerySet:
        bill_ids = [int(i) for i in value.split(',') if i.strip().isdigit()]
        if not bill_ids:
            return queryset
        return queryset.filter(votes__vote_session__bill__idp__in=bill_ids).distinct()

    def filter_bill_numbers(self, queryset: QuerySet, name: str, value: str) -> QuerySet:
        bill_numbers = [n.strip() for n in value.split(',') if n.strip()]
        if not bill_numbers:
            return queryset
        return queryset.filter(votes__vote_session__bill__bill_number__in=bill_numbers).distinct()
