from django.db.utils import OperationalError, ProgrammingError
from .models import Parliamentarian
from apps.core.services import CacheService

class ParliamentarianService:
    @staticmethod
    def get_party_options():
        """
        Retrieves unique parties for deputies with caching.
        """
        cache_key = "deputy_party_options_v1"
        cached = CacheService.get(cache_key)
        if cached:
            return cached

        try:
            parties = (
                Parliamentarian.objects
                .filter(chamber__icontains="deput")
                .exclude(party__isnull=True)
                .exclude(party="")
                .values_list("party", flat=True)
                .distinct()
            )
            options = [{"value": party, "label": party} for party in sorted(parties)]
            CacheService.set(cache_key, options, 86400) # 24h
            return options
        except (OperationalError, ProgrammingError):
            return []
