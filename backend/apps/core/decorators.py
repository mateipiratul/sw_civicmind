import hashlib
import threading
import logging
from functools import wraps
from rest_framework.response import Response
from apps.core.services import CacheService

logger = logging.getLogger(__name__)

def _async_set(key, data, ex):
    try:
        CacheService.set(key, data, ex=ex)
    except Exception as e:
        logger.error(f"Async cache set failed for key {key}: {e}", exc_info=True)

def cache_endpoint(timeout=86400, key_func=None):
    """
    Decorator to cache Django REST Framework ViewSet actions using CacheService.
    Caches the Response.data payload. Writes to the cache in a background thread 
    to prevent blocking the HTTP response.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(view_instance, request, *args, **kwargs):
            if key_func:
                cache_key = key_func(view_instance, request, *args, **kwargs)
            else:
                # Build a stable, unique cache key
                path = request.path
                query_string = request.META.get('QUERY_STRING', '')
                user_id = request.user.id if request.user.is_authenticated else 'anon'
                
                raw_key = f"{path}?{query_string}&user={user_id}"
                # Use a hash to keep keys short and avoid special character issues
                key_hash = hashlib.md5(raw_key.encode('utf-8')).hexdigest()
                cache_key = f"endpoint_{key_hash}"
                
            cached_data = CacheService.get(cache_key)
            if cached_data is not None:
                return Response(cached_data)
                
            response = view_func(view_instance, request, *args, **kwargs)
            
            # Cache only successful GET requests (status 200)
            if response.status_code == 200:
                # Using response.data assumes standard DRF views
                # Fire-and-forget the cache write so the user doesn't wait for Redis
                threading.Thread(target=_async_set, args=(cache_key, response.data, timeout)).start()
                
            return response
        return _wrapped_view
    return decorator
