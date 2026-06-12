import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)

class CacheService:
    @staticmethod
    def get(key: str, default=None, raise_exception: bool = False):
        try:
            return cache.get(key, default=default)
        except Exception as e:
            logger.error(f"Cache get error for key '{key}': {e}", exc_info=True)
            if raise_exception:
                raise
            return default

    @staticmethod
    def set(key: str, value, ex: int = 3600, raise_exception: bool = False) -> bool:
        try:
            cache.set(key, value, timeout=ex)
            return True
        except Exception as e:
            logger.error(f"Cache set error for key '{key}': {e}", exc_info=True)
            if raise_exception:
                raise
            return False

    @staticmethod
    def delete(key: str, raise_exception: bool = False) -> bool:
        try:
            cache.delete(key)
            return True
        except Exception as e:
            logger.error(f"Cache delete error for key '{key}': {e}", exc_info=True)
            if raise_exception:
                raise
            return False
