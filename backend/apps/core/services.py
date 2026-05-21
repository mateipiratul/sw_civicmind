import os
import json
from upstash_redis import Redis

class CacheService:
    _client = None

    @classmethod
    def _get_client(cls):
        if cls._client is None:
            url = os.getenv("UPSTASH_REDIS_REST_URL")
            token = os.getenv("UPSTASH_REDIS_REST_TOKEN")
            if url and token:
                cls._client = Redis(url=url, token=token)
        return cls._client

    @classmethod
    def get(cls, key: str):
        client = cls._get_client()
        if not client:
            return None
        
        try:
            value = client.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            print(f"Cache get error: {e}")
        return None

    @classmethod
    def set(cls, key: str, value, ex: int = 3600):
        client = cls._get_client()
        if not client:
            return False
        
        try:
            client.set(key, json.dumps(value), ex=ex)
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
        return False

    @classmethod
    def delete(cls, key: str):
        client = cls._get_client()
        if not client:
            return False
        
        try:
            client.delete(key)
            return True
        except Exception as e:
            print(f"Cache delete error: {e}")
        return False
