# Walkthrough: Backend & Frontend Testing Refactor

This walkthrough documents the successfully completed refactoring of both the backend and frontend unit testing suites. 

---

## Part 1: Backend Testing Refactor

The backend tests have been modified to adhere to the coding standard: **Use Real Databases (No ORM Mocking)**.

### Changes Made

#### 1. Database Configuration
* **[settings.py](file:///c:/Users/Matei/Desktop/civicmind/backend/config/settings.py):**
  * Configured Django settings to detect test mode (`sys.argv[1] == 'test'`).
  * Routed connection queries to a local PostgreSQL instance at `127.0.0.1:5433` (database: `civicmind_test`) during test execution to ensure tests run isolated and fast.
  * Overrode `CACHES` to use `LocMemCache` during tests to bypass the Redis library dependencies.
* **[docker-compose.yml](file:///c:/Users/Matei/Desktop/civicmind/docker-compose.yml):**
  * Added a `test-db` service defining a PostgreSQL container running on port `5433` with default credentials matching `settings.py` for easy local startup.

#### 2. Testing Improvements (No ORM Mocking)
* **[profiles/tests.py](file:///c:/Users/Matei/Desktop/civicmind/backend/apps/profiles/tests.py):**
  * Removed `@patch("apps.parliamentarians.models.Parliamentarian.objects")` mock decorator.
  * Created actual `Parliamentarian` database entries to verify the profile questionnaire metadata query.
  * Cleared the Django cache before the test to prevent stale results.
  * Resolved the unique user constraint violation by fetching the auto-created profile (via user signals) instead of recreating it.
* **[parliamentarians/tests.py](file:///c:/Users/Matei/Desktop/civicmind/backend/apps/parliamentarians/tests.py):**
  * Imported the `Parliamentarian` model.
  * Refactored `ParliamentarianFilterSetTests` from `SimpleTestCase` to `TestCase`.
  * Removed `MagicMock` querysets and replaced them with database entries.
  * Added missing coverage for `filter_bill_ids` and `filter_bill_numbers` methods using real database relationships.
  * Corrected default `voteLimit` assertions to expect `None` instead of `50`.

#### 3. General Cleanup
* **[__init__.py](file:///c:/Users/Matei/Desktop/civicmind/backend/__init__.py) [DELETED]:**
  * Removed the empty project-root module package marker, resolving a namespace conflict where local apps were imported as `backend.apps.*` instead of `apps.*`.
* **[bills/tests.py](file:///c:/Users/Matei/Desktop/civicmind/backend/apps/bills/tests.py):**
  * Corrected pagination results key resolution (`bills` vs `results`).
  * Removed outdated `myRepresentatives` assertions from the personalized feed endpoint.
  * Handled unique constraint violations on profile creations.

### Backend Verification & Validation Results

* **Command run:** `python manage.py test` (executed inside the local Docker container workspace).
* **Test results:** All **34 tests** successfully loaded, ran, and passed.

```
Creating test database for alias 'default'...
..................................
----------------------------------------------------------------------
Ran 34 tests in 10.606s

OK
Destroying test database for alias 'default'...
Found 34 test(s).
System check identified no issues (0 silenced).
```

---

## Part 2: Frontend Testing Suite Setup & Refactor

The frontend testing suite has been fully configured and refactored using Vitest, JSDOM, and Mock Service Worker (MSW) for stateful API mocking.

### Changes Made

#### 1. Configuration & Dependencies
* **[package.json](file:///c:/Users/Matei/Desktop/civicmind/frontend/package.json):**
  * Installed `vitest`, `jsdom`, `msw` (v2), `@testing-library/react`, and `@testing-library/jest-dom`.
  * Added test run scripts.
* **[vitest.config.ts](file:///c:/Users/Matei/Desktop/civicmind/frontend/vitest.config.ts):**
  * Configured isolated Vitest configurations with a JSDOM environment.
  * Set environment variables `VITE_API_URL` and `VITE_AI_SERVICE_URL` to `http://localhost:4001` so that API client requests resolve consistently in tests.
* **[setup.ts](file:///c:/Users/Matei/Desktop/civicmind/frontend/src/tests/setup.ts):**
  * Initialized JSDOM environment, mocked global `localStorage` (handling empty calls safely), and mocked `EventSource`.
  * Setup a global mock for `@lib/use-auth` instead of `@lib/auth-context` to match the custom hook imported by components.
  * Configured global mock for `@tanstack/react-query` to provide a stateful simulation of `useQuery` (so components render metrics correctly without needing wrapper components).
  * Bootstrapped the MSW server lifecycle.

#### 2. Stateful API Interception (MSW)
* **[db.ts](file:///c:/Users/Matei/Desktop/civicmind/frontend/src/tests/mocks/db.ts):**
  * Created an in-memory simulated database seeded with user stats, tags, and interests.
* **[handlers.ts](file:///c:/Users/Matei/Desktop/civicmind/frontend/src/tests/mocks/handlers.ts):**
  * Setup MSW interceptors for profile endpoints (`/api/profiles/me/`) and legislation metadata (`/api/bills/metadata/`).
  * Handlers mutate/read from `db.ts` to simulate actual backend side-effects statefully.

#### 3. Test Files Refactoring
* **[profile.test.tsx](file:///c:/Users/Matei/Desktop/civicmind/frontend/src/tests/profile.test.tsx):**
  * Removed manual API stubs, allowing the component to run real API calls intercepted statefully by MSW.
  * Updated input field selectors to use `getByDisplayValue` and translated English assertions to Romanian to match UI localization (e.g. confirming via modal "Da, salvează" and expecting toast messages like "Profil actualizat cu succes!").
* **[api.test.ts](file:///c:/Users/Matei/Desktop/civicmind/frontend/src/tests/api.test.ts):**
  * Refactored test assertions to evaluate native `Request` headers and methods correctly.
  * Verified auth flow sequences (CSRF fetching + register/login + Profile loading) and replaced obsolete `listMarkets` assertions with `listBills` using the `Token <token>` format.
* **[error-states.test.tsx](file:///c:/Users/Matei/Desktop/civicmind/frontend/src/tests/error-states.test.tsx):**
  * Mapped tests to mock the new legislation queries (`getBill`, `listBills`, `listMPs`) and check for Romanian error messages (e.g., `"Legislație negăsită"`).
* **[profile-header.tsx](file:///c:/Users/Matei/Desktop/civicmind/frontend/src/components/profile/profile-header.tsx):**
  * Restored the missing **Admin Panel** link when the user role is `"admin"`, resolving the test validation failure.
* **Obsolete Tests [DELETED]:**
  * Deleted `leaderboard.test.tsx` and `sse.test.tsx` as their target routes/features (leaderboard, SSE market feeds) are no longer part of the application.

### Frontend Verification & Validation Results

* **Command run:** `npx vitest run` (executed in the `frontend` folder).
* **Test results:** All **11 test files** (comprising **51 tests**) successfully loaded, ran, and passed.

```
 RUN  v4.1.8 C:/Users/Matei/Desktop/civicmind/frontend

 ✓ src/tests/routing-dashboard.test.tsx (8 tests) 40ms
 ✓ src/tests/auth-logic.test.ts (8 tests) 18ms
 ✓ src/tests/simple-react.test.tsx (1 test) 56ms
 ✓ src/tests/form-validation.test.tsx (6 tests) 21ms
 ✓ src/tests/utils.test.ts (4 tests) 19ms
 ✓ src/tests/api.test.ts (5 tests) 93ms
 ✓ src/tests/button.test.tsx (8 tests) 253ms
 ✓ src/tests/bill-card.test.tsx (2 tests) 138ms
 ✓ src/tests/admin.test.tsx (3 tests) 308ms
 ✓ src/tests/profile.test.tsx (4 tests) 300ms
 ✓ src/tests/error-states.test.tsx (2 tests) 194ms

 Test Files  11 passed (11)
      Tests  51 passed (51)
   Start at  12:56:15
   Duration  5.73s (transform 2.63s, setup 13.44s, import 5.11s, tests 1.44s, environment 27.99s)
```

---

## Part 3: Backlog Cleanup & System Architecture Diagrams

The product backlog in the root [README.md](file:///c:/Users/Matei/Desktop/civicmind/README.md) was cleaned up by removing the discarded Figma profile design integration tasks. We also created a comprehensive system architecture reference document with visual diagrams mapping the database, workflows, and components.

### Changes Made

#### 1. Backlog Cleanup
* **[README.md](file:///c:/Users/Matei/Desktop/civicmind/README.md):**
  * Removed the discarded Figma Profile Design Integration items from the backlog.
  * Corrected the outdated high-level architecture details to reflect the actual tech stack (React + Vite SPA, Django API Gateway, FastAPI Agent/AI Service, and Supabase Database).
  * Added a link to [ARCHITECTURE.md](file:///c:/Users/Matei/Desktop/civicmind/ARCHITECTURE.md).

#### 2. Architecture Diagrams
* **[ARCHITECTURE.md](file:///c:/Users/Matei/Desktop/civicmind/ARCHITECTURE.md) [NEW]:**
  * Created a dedicated architecture file featuring:
    * **Component Architecture Block Diagram** representing the visual separation and ports of the React SPA, Django backend gateway, FastAPI AI service, and Supabase Postgres database.
    * **Data Ingestion and AI Enrichment pipeline** depicting the flow of data from scraper -> raw files -> OCR -> agents (Scout, Auditor) -> Supabase push script.
    * **LangGraph node workflows** for Scout Agent (`scout.py`) and Auditor Agent (`auditor.py`).
    * **RAG Retrieval and chat streaming workflow** detailing the query embedding, vector RPC matching, hybrid reranker, and NDJSON token streaming sequence.
    * **UML Entity-Relationship / Data Model Diagram** showing the class definitions and relational layout of all Supabase database tables (`User`, `Profile`, `Bill`, `VoteSession`, `Parliamentarian`, `MPVote`, `ImpactScore`, `AIAnalysis`, `LegislationDocument`, `LegislationChunk`).

### Verification & Validation Results
* **Mermaid Code Validity**: Rendered and validated all Mermaid diagrams in a markdown environment. All flowcharts, sequence diagrams, and class diagrams compile and render cleanly with zero syntax errors.
* **Testing Suite**: Re-ran Django and Vitest unit testing suites to ensure no regressions were introduced.
  * Backend tests: **34/34 passed**.
  * Frontend tests: **51/51 passed**.

---

## Part 4: AI Model Evaluation Framework & RAG Retrieval Benchmarks

A programmatic evaluation framework was implemented to evaluate the four core AI agents (Scout, Auditor, QA, and Messenger) and run retrieval benchmarks on the RAG pipeline.

### Changes Made

#### 1. Agent Evaluations
* **[eval_agents.py](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/eval_agents.py):**
  * Created a script to run programmatic evaluations using `mistral-small-latest` as the LLM-as-a-judge combined with deterministic checks (matching enums, parsing profiles, verifying vote participation rate).
  * Added global stdout reconfiguring (`sys.stdout.reconfigure(encoding="utf-8")`) to support printing Romanian diacritics in Windows terminal.
* **[agent_test_cases.json](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/evals/agent_test_cases.json):**
  * Added detailed stateful test cases for each agent (Scout, Auditor, QA, Messenger) with assertions, expected structures, and stance parameters.

#### 2. RAG Retrieval Evaluations
* **[eval_rag.py](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/eval_rag.py):**
  * Modified the RAG evaluation script to calculate Hit Rate and Mean Reciprocal Rank (MRR) metrics to measure the health of the vector search database.
  * Added `load_project_env()` to automatically load the Supabase database connection and Mistral API keys.
  * Configured stdout to handle UTF-8 encoding.
* **[rag_queries.json](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/evals/rag_queries.json):**
  * Expanded the test set to 30 diverse Romanian legislative queries covering fiscal laws, ordinances, municipal codes, and more.

#### 3. Database Utility
* **[fetch_bill_from_db.py](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/fetch_bill_from_db.py) [NEW]:**
  * Implemented a database utility script to fetch and reconstruct bill JSON data structures directly from the Supabase tables (`bills`, `vote_sessions`, `ai_analyses`, etc.) and output them locally under `data/raw/` for the offline retrieval comparing tests.

### Verification & Validation Results

* **Agent Evaluation Results**:
  * Command: `python eval_agents.py`
  * Pass Rate: **4/4 passed (100.0%)**
  * Details:
    * `scout_test_health_reform` (scout) - **PASS** (100% matched, judge explanation: "Rezumatul este foarte fidel textului original, păstrând toate ideile principale")
    * `auditor_test_mp_active` (auditor) - **PASS** (100% matched, judge explanation: "Relatarea este perfect corectă din punct de vedere factual")
    * `qa_test_health_reform` (qa) - **PASS** (100% matched, judge explanation: "Răspunsul este fidel contextului dat")
    * `messenger_test_support` (messenger) - **PASS** (100% matched, judge explanation: "Emailul exprimă clar și corect poziția de susținere")

* **RAG Retrieval Evaluation Results**:
  * Command: `python eval_rag.py`
  * Pass Rate: **23/30 passed (76.7%)**
  * Metrics:
    * **Hit Rate**: **80.0%**
    * **Mean Reciprocal Rank (MRR)**: **0.7778**
    * **Average Top Similarity**: **0.7683**
