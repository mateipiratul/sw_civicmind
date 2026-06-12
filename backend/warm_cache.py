import os
import time
import requests
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:8000")

# Endpoints that are public and frequently accessed, ideal for pre-fetching
ENDPOINTS_TO_WARM = [
    "/api/bills/",
    "/api/mps/",
    "/api/mps/metadata/",
    "/api/mps/directory/",
    "/api/mps/vote-map/",
]

def warm_cache():
    logger.info(f"Starting cache warming for base URL: {BASE_URL}")
    
    for endpoint in ENDPOINTS_TO_WARM:
        url = f"{BASE_URL}{endpoint}"
        try:
            start = time.time()
            logger.info(f"Warming {url}...")
            # Ping the endpoint to trigger the cache logic
            response = requests.get(url, timeout=30)
            elapsed = time.time() - start
            
            if response.status_code == 200:
                logger.info(f"Successfully warmed {url} in {elapsed:.2f}s")
            else:
                logger.warning(f"Failed to warm {url}. Status: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error warming {url}: {e}")

if __name__ == "__main__":
    warm_cache()
