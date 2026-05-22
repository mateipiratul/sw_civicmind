from django.core.cache import cache

class CacheService:
    @staticmethod
    def get(key: str):
        try:
            return cache.get(key)
        except Exception as e:
            print(f"Cache get error: {e}")
            return None

    @staticmethod
    def set(key: str, value, ex: int = 3600):
        try:
            cache.set(key, value, timeout=ex)
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False

    @staticmethod
    def delete(key: str):
        try:
            cache.delete(key)
            return True
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False
