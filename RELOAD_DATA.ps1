# Simple CivicMind Data Update (PowerShell)

Write-Host "1/4: Scraping..."
docker-compose exec ai-service python main.py --days 14 --skip-existing

Write-Host "2/4: Analyzing..."
docker-compose exec ai-service python run_agents.py --all

Write-Host "3/4: Indexing..."
docker-compose exec ai-service python rag_index.py --source bills --all

Write-Host "4/4: Pushing to Database..."
docker-compose exec ai-service python db/push_to_supabase.py

Write-Host "Done!"
