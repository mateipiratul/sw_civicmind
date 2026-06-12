import logging
from .models import Parliamentarian
from apps.core.services import CacheService

logger = logging.getLogger(__name__)

class ParliamentarianService:
    @staticmethod
    def get_party_options(raise_exception: bool = False):
        """
        Retrieves unique parties for deputies with caching.
        """
        cache_key = "deputy_party_options_v1"
        try:
            cached = CacheService.get(cache_key, raise_exception=raise_exception)
            if cached:
                return cached

            parties = (
                Parliamentarian.objects
                .filter(chamber__icontains="deput")
                .exclude(party__isnull=True)
                .exclude(party="")
                .values_list("party", flat=True)
                .distinct()
            )
            options = [{"value": party, "label": party} for party in sorted(parties)]
            CacheService.set(cache_key, options, 86400, raise_exception=raise_exception)
            return options
        except Exception as e:
            logger.error(f"Error fetching party options: {e}", exc_info=True)
            if raise_exception:
                raise
            return []
