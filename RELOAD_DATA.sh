#!/bin/bash
# Simple CivicMind Data Update

echo "1/4: Scraping..."
docker-compose exec -T ai-service python main.py --days 14 --skip-existing

echo "2/4: Analyzing..."
docker-compose exec -T ai-service python run_agents.py --all

echo "3/4: Indexing..."
docker-compose exec -T ai-service python rag_index.py --source bills --all

echo "4/4: Pushing to Database..."
docker-compose exec -T ai-service python db/push_to_supabase.py

echo "Done!"
