# Running CivicMind locally

Three processes. Open three terminal tabs.

---

## Prerequisites

```bash
# Python deps (once)
pip install -r legislative-intelligence/requirements.txt
pip install -r backend/requirements.txt

# Node deps (once)
cd frontend && npm install
```

Each service needs its own `.env`. Copy the examples and fill in your keys:

```bash
cp legislative-intelligence/.env.example legislative-intelligence/.env
# set MISTRAL_API_KEY, SUPABASE_URL, SUPABASE_KEY

cp backend/.env.example backend/.env       # if it exists; otherwise create it
# set DATABASE_URL, SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
```

---

## Terminal 1 — FastAPI AI service (bills, MPs, agents, feed, RAG)

```bash
cd legislative-intelligence
python -m uvicorn api.main:app --reload --port 8001
```

- Swagger docs: http://localhost:8001/docs
- Health check: http://localhost:8001/health
- Anonymous feed: http://localhost:8001/feed
- Stats: http://localhost:8001/stats

> Non-RAG endpoints work with local JSON files only (no credentials needed).
> RAG endpoints require `SUPABASE_URL`, `SUPABASE_KEY`, and `MISTRAL_API_KEY`.

---

## Terminal 2 — Django backend (auth, profiles)

```bash
cd backend
python manage.py migrate
python manage.py runserver 8000
```

- Auth: `POST http://localhost:8000/auth/register`
- Auth: `POST http://localhost:8000/auth/login`
- Profile: `GET/PUT http://localhost:8000/api/profiles/me/`

---

## Terminal 3 — React frontend

```bash
cd frontend
npm run dev
```

- App: http://localhost:5173

> Still a Vite scaffold — no CivicMind screens yet. Skip unless you are building UI.

---

## Quick test without the frontend

Open `legislative-intelligence/index.html` directly in a browser while the FastAPI server is running on port 8001.

Pass a different port via the URL if needed: `index.html?api=http://localhost:8002`

---

## Scraper & agents (CLI — not a server)

```bash
cd legislative-intelligence

python main.py --days 30 --max 20           # scrape latest bills from cdep.ro
python main.py --days 30 --skip-existing    # incremental — skip existing bills
python enrich_ocr.py                         # OCR all bill PDFs (Mistral OCR)
python run_agents.py --scout                 # Scout analysis for all bills
python run_agents.py --scout --workers 4     # Scout in parallel (max 4)
python run_agents.py --auditor               # MP impact scores
python run_agents.py --notifications         # detect events + queue notification jobs
python run_agents.py --deliver-notifications # dry-run delivery
python db/push_to_supabase.py                # push everything to Supabase
```

---

## Port reference

| Service | Port | Notes |
|---------|------|-------|
| FastAPI | 8001 | Main API — bills, MPs, agents, feed, RAG |
| Django | 8000 | Auth + profiles |
| Vite | 5173 | React dev server |

If 8001 is blocked by Windows, use 8002:
```bash
python -m uvicorn api.main:app --reload --port 8002
```
