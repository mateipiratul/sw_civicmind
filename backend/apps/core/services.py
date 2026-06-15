import logging
import json
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

try:
    from upstash_redis import Redis as UpstashRedis
except ImportError:
    UpstashRedis = None

class CacheService:
    _upstash_client = None
    _client_initialized = False

    @classmethod
    def get_client(cls):
        if not cls._client_initialized:
            cls._client_initialized = True
            if getattr(settings, "TESTING", False):
                return None

            import os
            url = os.environ.get('UPSTASH_REDIS_REST_URL')
            token = os.environ.get('UPSTASH_REDIS_REST_TOKEN')
            
            if not url or not token:
                logger.critical("CRITICAL: Upstash Redis credentials (UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN) are missing from the environment.")
            elif UpstashRedis is not None:
                try:
                    cls._upstash_client = UpstashRedis(url=url, token=token)
                except Exception as e:
                    logger.error(f"Failed to initialize Upstash Redis client: {e}")
            else:
                logger.warning("Upstash Redis library missing. Falling back to Django cache.")
        return cls._upstash_client

    @staticmethod
    def get(key: str, default=None, raise_exception: bool = False):
        try:
            client = CacheService.get_client()
            if client:
                val = client.get(key)
                if val is not None:
                    try:
                        parsed_val = json.loads(val) if isinstance(val, str) else val
                        logger.debug(f"[Redis Cache] Hit for key: {key}")
                        return parsed_val
                    except (ValueError, TypeError) as e:
                        logger.error(f"Error parsing cache data for key '{key}': {e}")
                        logger.debug(f"[Redis Cache] Miss for key: {key}")
                        return default
                else:
                    logger.debug(f"[Redis Cache] Miss for key: {key}")
                    return default
            
            # Fallback to django cache
            val = cache.get(key)
            if val is not None:
                logger.debug(f"[Redis Cache] Hit for key: {key}")
                return val
            logger.debug(f"[Redis Cache] Miss for key: {key}")
            return default
        except Exception as e:
            logger.error(f"Cache get error for key '{key}': {e}", exc_info=True)
            if raise_exception:
                raise
            return default

    @staticmethod
    def set(key: str, value, ex: int = 3600, raise_exception: bool = False) -> bool:
        if value is None:
            logger.warning(f"Attempted to cache None value for key '{key}'. Aborting.")
            return False

        try:
            client = CacheService.get_client()
            if client:
                from django.core.serializers.json import DjangoJSONEncoder
                # Ensure value is safely serialized
                serialized_val = json.dumps(value, cls=DjangoJSONEncoder)
                client.set(key, serialized_val, ex=ex)
                return True
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
            client = CacheService.get_client()
            if client:
                client.delete(key)
                return True
            cache.delete(key)
            return True
        except Exception as e:
            logger.error(f"Cache delete error for key '{key}': {e}", exc_info=True)
            if raise_exception:
                raise
            return False
