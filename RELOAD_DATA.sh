#!/bin/bash
# Simple CivicMind Data Update

echo "1/3: Scraping..."
docker-compose exec -T ai-service python main.py --days 14 --skip-existing

echo "2/3: Analyzing..."
docker-compose exec -T ai-service python run_agents.py --all

echo "3/3: Indexing..."
docker-compose exec -T ai-service python rag_index.py --source bills --all

echo "Done!"
