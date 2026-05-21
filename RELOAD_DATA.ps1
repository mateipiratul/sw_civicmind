# Simple CivicMind Data Update (PowerShell)

Write-Host "1/3: Scraping..."
docker-compose exec ai-service python main.py --days 14 --skip-existing

Write-Host "2/3: Analyzing..."
docker-compose exec ai-service python run_agents.py --all

Write-Host "3/3: Indexing..."
docker-compose exec ai-service python rag_index.py --source bills --all

Write-Host "Done!"
