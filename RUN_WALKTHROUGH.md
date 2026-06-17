# 🚀 CivicMind: Local Execution & Implementation Walkthrough

This document compiles the complete information required to set up, run, and understand the implementation of the **CivicMind** platform. It merges local running instructions with the comprehensive history of testing refactors, architecture changes, AI evaluations, and performance optimizations.

---

## 🛠️ Part 1: Local Setup & Running Guide

This section explains how to run the three core processes of the CivicMind project locally.

### 1. Prerequisites

First, install all necessary dependencies for both Python backends and the React frontend.

```bash
# Python dependencies (run once)
pip install -r legislative-intelligence/requirements.txt
pip install -r backend/requirements.txt

# Node dependencies (run once)
cd frontend && npm install
```

#### Environment Variables
Each service requires its own `.env` file. Copy the examples and add your specific API keys:

```bash
# FastAPI AI Service Configuration
cp legislative-intelligence/.env.example legislative-intelligence/.env
# Required keys to set: MISTRAL_API_KEY, SUPABASE_URL, SUPABASE_KEY

# Django Backend Configuration
cp backend/.env.example backend/.env       # if it exists; otherwise create it
# Required keys to set: DATABASE_URL, SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
```

### 2. Running the Services

To run the full stack locally, open three separate terminal tabs or windows and execute the following commands:

#### Terminal 1 — FastAPI AI Service (bills, MPs, agents, feed, RAG)
```bash
cd legislative-intelligence
python -m uvicorn api.main:app --reload --port 8001
```
* **Swagger Documentation:** [http://localhost:8001/docs](http://localhost:8001/docs)
* **Health Check:** [http://localhost:8001/health](http://localhost:8001/health)
* **Anonymous Feed:** [http://localhost:8001/feed](http://localhost:8001/feed)
* **Stats:** [http://localhost:8001/stats](http://localhost:8001/stats)

> [!NOTE]
> Non-RAG endpoints will function using local JSON files alone without requiring API credentials. RAG endpoints require `SUPABASE_URL`, `SUPABASE_KEY`, and `MISTRAL_API_KEY`.

#### Terminal 2 — Django Backend (auth, profiles)
```bash
cd backend
python manage.py migrate
python manage.py runserver 8000
```
* **Register:** `POST http://localhost:8000/auth/register`
* **Login:** `POST http://localhost:8000/auth/login`
* **User Profile:** `GET/PUT http://localhost:8000/api/profiles/me/`

#### Terminal 3 — React Frontend
```bash
cd frontend
copy .env.example .env
npm run dev
```
* **App URL:** [http://localhost:5173](http://localhost:5173)

The React frontend proxies calls to the Django backend by default:
* Browser requests stay on `http://localhost:5173`.
* Path prefixes `/api/*` and `/auth/*` are proxied to Django running on `http://localhost:8000`.

To point Vite to a different Django port, update `frontend/.env`:
```bash
VITE_DJANGO_API_ORIGIN=http://localhost:8002
```
Only set `VITE_API_URL` if you deliberately want the browser to call Django directly.

---

### 3. Quick Test & Port References

#### Quick Test Without the Frontend
You can open `legislative-intelligence/index.html` directly in any web browser while the FastAPI server is running on port `8001`. Pass a custom port via the query string if needed: `index.html?api=http://localhost:8002`

#### Port Reference Table

| Service | Default Port | Alternative | Notes |
|---------|--------------|-------------|-------|
| **Vite Dev Server** | 5173 | N/A | React client application |
| **Django Backend** | 8000 | 8002 | Auth, profiles, and API gateway |
| **FastAPI Service** | 8001 | 8003 | AI agents, RAG search, scrapers |

* If Django port `8000` is busy, run:
  ```bash
  python manage.py runserver 8002
  ```
  *(Remember to update `VITE_DJANGO_API_ORIGIN` in `frontend/.env` to point to port `8002`)*
* If FastAPI port `8001` is blocked by Windows, run:
  ```bash
  python -m uvicorn api.main:app --reload --port 8003
  ```

---

### 4. Scrapers & Agents (CLI Commands)

The Legislative Intelligence service includes command-line scripts to scrape new bills and run the agent pipelines:

```bash
cd legislative-intelligence

# Scrape the latest bills from cdep.ro (last 30 days, max 20 bills)
python main.py --days 30 --max 20

# Run incremental scraper (skip already scraped bills)
python main.py --days 30 --skip-existing

# OCR all bill PDFs using Mistral OCR
python enrich_ocr.py

# Run Scout analysis on all bills
python run_agents.py --scout

# Run Scout analysis in parallel (maximum of 4 worker threads)
python run_agents.py --scout --workers 4

# Recalculate MP impact scores based on voting history
python run_agents.py --auditor

# Detect key legislative events and queue notifications
python run_agents.py --notifications

# Dry-run notification delivery
python run_agents.py --deliver-notifications

# Push scraped data, analyses, and scores to Supabase
python db/push_to_supabase.py
```

---

## 🧪 Part 2: Testing Suite Refactoring & Setup

To ensure system reliability, both backend and frontend test suites were refactored to adhere to strict validation guidelines.

### 1. Backend Testing Refactor (Using Real Databases)
Backend testing was refactored to follow the standard: **Use Real Databases (No ORM Mocking)**.

#### Changes Made
* **[settings.py](file:///c:/Users/Matei/Desktop/civicmind/backend/config/settings.py):**
  * Configured Django to detect test mode (`sys.argv[1] == 'test'`).
  * Routed connection queries to a local PostgreSQL instance running at `127.0.0.1:5433` (database: `civicmind_test`) to ensure fast and isolated test environments.
  * Overrode `CACHES` to use `LocMemCache` to bypass Redis dependency errors during tests.
* **[docker-compose.yml](file:///c:/Users/Matei/Desktop/civicmind/docker-compose.yml):**
  * Added a `test-db` service defining a PostgreSQL container running on port `5433` with matching credentials.
* **[profiles/tests.py](file:///c:/Users/Matei/Desktop/civicmind/backend/apps/profiles/tests.py):**
  * Removed ORM mocks and `@patch` decorators.
  * Created actual database entries for `Parliamentarian` to verify questionnaire metadata.
  * Cleared the Django cache before tests.
  * Handled unique user profile constraints securely.
* **[parliamentarians/tests.py](file:///c:/Users/Matei/Desktop/civicmind/backend/apps/parliamentarians/tests.py):**
  * Refactored `ParliamentarianFilterSetTests` from `SimpleTestCase` to `TestCase`.
  * Replaced `MagicMock` querysets with actual database rows and relations.
  * Added coverage for `filter_bill_ids` and `filter_bill_numbers` methods.
* **Cleanup:**
  * Deleted the empty `backend/__init__.py` module marker to resolve namespace importing issues (`apps.*` vs `backend.apps.*`).
  * Patched `bills/tests.py` to fix pagination key assertions (`results` vs `bills`) and constraint violations.

#### Verification
To run the backend tests, launch the PostgreSQL test container and run:
```bash
python manage.py test
```
**Results:** All **34 tests** successfully loaded, ran, and passed:
```
Creating test database for alias 'default'...
..................................
----------------------------------------------------------------------
Ran 34 tests in 10.606s

OK
Destroying test database for alias 'default'...
```

---

### 2. Frontend Testing Suite Setup (Vitest + JSDOM + MSW)
The frontend testing suite was fully configured and refactored using Vitest, JSDOM, and Mock Service Worker (MSW) for stateful API mocking.

#### Changes Made
* **[package.json](file:///c:/Users/Matei/Desktop/civicmind/frontend/package.json):**
  * Installed `vitest`, `jsdom`, `msw` (v2), `@testing-library/react`, and `@testing-library/jest-dom`.
* **[vitest.config.ts](file:///c:/Users/Matei/Desktop/civicmind/frontend/vitest.config.ts):**
  * Configured isolated test environment using JSDOM.
  * Set `VITE_API_URL` and `VITE_AI_SERVICE_URL` environment variables to `http://localhost:4001` so API client requests resolve consistently in tests.
* **[setup.ts](file:///c:/Users/Matei/Desktop/civicmind/frontend/src/tests/setup.ts):**
  * Set up JSDOM globals, mocked `localStorage` and `EventSource`.
  * Set up global mocks for `@lib/use-auth` and `@tanstack/react-query` to simulate stateful token auth and query states.
  * Controlled the MSW server lifecycle.
* **Stateful Mocking ([db.ts](file:///c:/Users/Matei/Desktop/civicmind/frontend/src/tests/mocks/db.ts) & [handlers.ts](file:///c:/Users/Matei/Desktop/civicmind/frontend/src/tests/mocks/handlers.ts)):**
  * Created an in-memory simulated database seeded with profile metrics.
  * Set up MSW API interceptors for profile and legislative metadata endpoints to dynamically mutate/read mock data.
* **Test Refactoring:**
  * Refactored `profile.test.tsx` to let MSW handle API requests statefully, updating test assertions to match translated Romanian strings (e.g. `"Da, salvează"` and `"Profil actualizat cu succes!"`).
  * Refactored `api.test.ts` to assert against actual HTTP headers.
  * Updated `error-states.test.tsx` to assert Romanian error messages.
  * Restored the missing **Admin Panel** link when the user role is `"admin"` in [profile-header.tsx](file:///c:/Users/Matei/Desktop/civicmind/frontend/src/components/profile/profile-header.tsx).
  * Deleted obsolete test files (`leaderboard.test.tsx`, `sse.test.tsx`).

#### Verification
To run the frontend test suite:
```bash
cd frontend
npx vitest run
```
**Results:** All **11 test files** (comprising **51 tests**) passed in 5.73s:
```
✓ src/tests/routing-dashboard.test.tsx (8 tests)
✓ src/tests/auth-logic.test.ts (8 tests)
✓ src/tests/simple-react.test.tsx (1 test)
✓ src/tests/form-validation.test.tsx (6 tests)
✓ src/tests/utils.test.ts (4 tests)
✓ src/tests/api.test.ts (5 tests)
✓ src/tests/button.test.tsx (8 tests)
✓ src/tests/bill-card.test.tsx (2 tests)
✓ src/tests/admin.test.tsx (3 tests)
✓ src/tests/profile.test.tsx (4 tests)
✓ src/tests/error-states.test.tsx (2 tests)

Test Files  11 passed (11)
     Tests  51 passed (51)
```

---

## 🎨 Part 3: Architecture & Backlog Evolution

### 1. Backlog Cleanup
The product backlog in the root [README.md](file:///c:/Users/Matei/Desktop/civicmind/README.md) was cleaned up to remove discarded Figma tasks, align technical stack references, and link directly to [ARCHITECTURE.md](file:///c:/Users/Matei/Desktop/civicmind/ARCHITECTURE.md).

### 2. Architecture Diagrams
A dedicated [ARCHITECTURE.md](file:///c:/Users/Matei/Desktop/civicmind/ARCHITECTURE.md) was added to map out:
* **Component Architecture Block Diagram** (React SPA, Django backend gateway, FastAPI AI service, Supabase Postgres).
* **Data Ingestion and AI Enrichment pipeline** (cdep.ro scraper -> raw files -> OCR -> Scout/Auditor agents -> Supabase push).
* **LangGraph workflows** for Scout Agent (`scout.py`) and Auditor Agent (`auditor.py`).
* **RAG Retrieval & Chat Streaming workflow** (hybrid vector RPC queries, reranking, and token streaming).
* **UML Entity-Relationship / Data Model Diagram** showing complete relational tables.

---

## 🤖 Part 4: AI Model Evaluation & RAG Retrieval Benchmarks

A programmatic evaluation framework was implemented to evaluate the core AI agents and benchmark the RAG retrieval pipeline.

### 1. Agent Evaluations
* **[eval_agents.py](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/eval_agents.py):**
  * Runs programmatic evaluations utilizing `mistral-small-latest` as an LLM-as-a-judge alongside deterministic validations (verifying structures, enums, formats).
  * Handles Romanian stdout encoding properly under Windows environments.
* **[agent_test_cases.json](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/evals/agent_test_cases.json):**
  * Defines stateful test cases, expectations, and parameters for the Scout, Auditor, QA, and Messenger agents.

**Results:** Pass Rate: **4/4 passed (100%)**
* `scout_test_health_reform` — **PASS**
* `auditor_test_mp_active` — **PASS**
* `qa_test_health_reform` — **PASS**
* `messenger_test_support` — **PASS**

### 2. RAG Retrieval Benchmarks
* **[eval_rag.py](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/eval_rag.py):**
  * Computes Hit Rate and Mean Reciprocal Rank (MRR) to verify vector database query accuracy.
* **[rag_queries.json](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/evals/rag_queries.json):**
  * Contains 30 diverse Romanian legislative query test cases.
* **[fetch_bill_from_db.py](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/fetch_bill_from_db.py):**
  * Reconstructs bill JSON structures from Supabase to store under `data/raw/` for offline retrieval comparisons.

**Results:** Pass Rate: **23/30 passed (76.7%)**
* **Hit Rate:** 80.0%
* **Mean Reciprocal Rank (MRR):** 0.7778
* **Average Top Similarity:** 0.7683

---

## ⚡ Part 5: Caching & Performance Optimizations

Active caching was implemented to reduce Supabase database load and lower latency under heavy traffic.

### 1. Custom Caching Decorator
* **[decorators.py](file:///c:/Users/Matei/Desktop/civicmind/backend/apps/core/decorators.py):**
  * Created `@cache_endpoint` to automatically hash request paths, query strings, and `request.user.id` to generate unique keys.
  * Caches views for a default TTL of 24 hours in Upstash Redis.
* **Endpoints Cached:**
  * **Bills:** List, retrieve, votes, and personalized feed endpoints.
  * **Parliamentarians:** List, retrieve, metadata, directory, vote map, and representatives.

### 2. Advanced Non-Blocking Caching
To prevent latencies during initial cache misses ("cold starts"), caching was optimized with non-blocking techniques:
* **Fire-and-Forget Caching:** Modified `@cache_endpoint` to spin off Upstash Redis writes into a background thread (`threading.Thread`). This immediately returns the response to the user and writes to Redis asynchronously.
* **JSON Serialization:** Updated `CacheService` to handle Python date objects using `DjangoJSONEncoder`.

### 3. Payload Reduction & DB Query Chunking
* **Queryset Splitting (`services.py`):** Split bill queries into `get_list_bills_queryset()` (excludes heavy text prefetching of arguments and key ideas) and `get_detail_bills_queryset()` (loads everything for detail view).
* **Lightweight Serializers (`serializers.py` & `views.py`):** Added `AIAnalysisListSerializer` to exclude massive text fields from feeds. Configured the feed views to use this lighter model, reducing serialization payloads.

### 4. Proactive Cache Warming
* **[warm_cache.py](file:///c:/Users/Matei/Desktop/civicmind/backend/warm_cache.py):**
  * Sequentially pings high-traffic API endpoints to warm the Redis cache before users trigger them.

**Results:**
* Run warming script:
  ```bash
  python warm_cache.py
  ```
* Response time reductions:
  * `/api/bills/` list: **0.83s** (down from ~40s).
  * `/api/mps/` list: **0.11s** (down from ~15s).
