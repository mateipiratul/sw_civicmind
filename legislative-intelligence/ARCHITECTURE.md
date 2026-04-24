# CivicMind — Architecture & Implementation Status

> Last updated: 2026-04-25  
> Stack: Python 3.11 · Mistral AI · LangGraph · FastAPI · Supabase (pending) · React (pending)

---

## What Is Built

CivicMind is a Romanian civic-tech platform that scrapes legislative data from cdep.ro, enriches it with AI analysis, and exposes it to citizens through a transparency dashboard. The first four AI agents are working end-to-end against live Mistral API calls — no mocks. Agent 5 is now implemented as a deterministic notification/watchdog pipeline that flags bill events and queues draft email jobs without sending them.

---

## Current State (as of 2026-04-25)

| Component | Status | Notes |
|-----------|--------|-------|
| Scraper (cdep.ro) | ✅ Done | 11 bills, 3,053 MP vote records; CDEP-only for MVP; incremental `--skip-existing` added |
| OCR (Mistral OCR 3) | ✅ Done | All bill PDFs embedded in JSON |
| Agent 1 — Scout | ✅ Done | All 11 bills have `ai_analysis`; `run_agents.py --scout` supports up to 4 workers |
| Agent 2 — Auditor | ✅ Done | 284 MPs scored, narratives generated; narrative calls retry once on transient failure |
| Agent 3 — Q&A | ✅ Done | Live Mistral calls, tested |
| Agent 4 — Messenger | ✅ Done | Live Mistral calls, tested |
| REST API (FastAPI) | ✅ Done | 14 endpoints, file-based, no DB needed |
| Test UI | ✅ Done | `index.html` — single file, vanilla JS |
| Supabase ingestion script | ✅ Done | Pushes bills, votes, AI analyses, impact scores, notification preferences/events/flags/jobs |
| Supabase SQL migration | ✅ Done | `db/schema.sql`; backend team runs it once in Supabase |
| Supabase tables | ⏳ Pending | Pending actual Supabase project migration |
| Agent 5 — Notifications | ✅ MVP Done | Deterministic watchdog + flag classifier + local job queue + dry-run delivery |
| React/Next.js frontend | ⏳ Pending | Teammate |
| API deployment | ⏳ Pending | Teammate |

---

## Project Layout

```
civicmind/
├── sw_civicmind/            # Git repo root
│   ├── backend/             # Existing backend app
│   └── legislative-intelligence/
│       ├── index.html               # Test UI — open in browser while API is running
│       ├── main.py                  # Scraper CLI entry point
│       ├── enrich_ocr.py            # OCR enrichment (run after main.py)
│       ├── run_agents.py            # Agent CLI (scout / auditor / qa / messenger / all)
│       ├── requirements.txt
│       ├── .env                     # MISTRAL_API_KEY, SUPABASE_URL, SUPABASE_KEY
│       ├── .env.example
│       ├── .gitignore               # excludes .env, data/raw/, data/processed/
│       │
│       ├── scraper/
│       │   ├── cdep.py              # Orchestrator + _LegacySSLAdapter (cdep.ro TLS bypass)
│       │   ├── parsers.py           # HTML parsers — vote tables, bill detail, MP rows
│       │   ├── pdf_ocr.py           # Mistral OCR 3 — downloads PDF bytes, uploads to Files API
│       │   ├── models.py            # Pydantic models
│       │   └── utils.py             # slugify, safe_int, VOTE_MAP, STATUS_MAP, classify_vote_type
│       │
│       ├── agents/
│       │   ├── state.py             # TypedDict states — ScoutState, AuditorState, QAState, MessengerState
│       │   ├── prompts.py           # All LLM prompts in Romanian — edit here, not in agent files
│       │   ├── scout.py             # Agent 1 — Legislative Scout (7-node LangGraph)
│       │   ├── auditor.py           # Agent 2 — Political Auditor (4-node LangGraph)
│       │   ├── qa.py                # Agent 3 — Civic Q&A (3-node LangGraph)
│       │   ├── messenger.py         # Agent 4 — Civic Messenger (3-node LangGraph)
│       │   ├── notifications.py     # Agent 5 — flags bill events and queues notification jobs
│       │   └── notification_delivery.py # Dry-run notification delivery worker
│       │
│       ├── api/
│       │   └── main.py              # FastAPI — reads from data/ JSON files, wraps agents
│       │
│       ├── db/
│       │   ├── schema.sql           # Supabase migration
│       │   └── push_to_supabase.py  # Upserts all JSON data into Supabase tables
│       ├── notification_preferences.example.json  # Example opt-in preferences for Agent 5
│       │
│       └── data/
│           ├── raw/                 # bill_XXXXX.json — one file per bill (gitignored)
│           └── processed/
│               └── impact_scores.json  # Auditor output — 284 MPs, sorted by score desc
│
└── move_to_legislative_intelligence.ps1  # One-time move script used for this migration
```

---

## Layer 1 — Data Scraper

### How to run

```bash
python main.py --days 30 --max 20          # scrape latest bills
python main.py --days 30 --skip-existing   # reuse existing bills, append only new votes
python enrich_ocr.py                        # add OCR to any bill missing it
```

### Key files

**`scraper/cdep.py`**
- `_LegacySSLAdapter` — cdep.ro uses a self-signed cert + old TLS ciphers. Uses `create_urllib3_context()` with `CERT_NONE`, `check_hostname=False`, `DEFAULT:@SECLEVEL=1`. All requests go through this adapter.
- `find_session_days(days_back)` — walks backwards day by day, finds dates with `evot2015.nominal` links
- `get_vote_sessions(date)` → `parse_vote_list` — deduplicates by `seen_idvs: set` (each row has 3 anchor tags with the same `idv`)
- `get_nominal_votes(idv)` → `parse_nominal_votes` — MP row detection via `re.match(r"^\d+\.$", cells[0])`
- `find_bill_idp(bill_number)` — year-keyed cache; loads full bill list for a year on first miss
- `scrape_bill_detail(idp)` — fetches `cam=1&idp={idp}` (Chamber view)
- `run_scraper()` — filters for final votes on PL bills only (skips PHCD resolutions)
- `--skip-existing` — loads existing `data/raw/bill_{idp}.json`, skips detail scraping/OCR, and appends only new vote sessions
- Current MVP scope is CDEP-only (`cam=1`). Senate support is legally needed for a full Parliament lifecycle, but intentionally deferred.

**`scraper/pdf_ocr.py`**
- All cdep.ro PDFs are scanned images (CCITT-compressed) — no embedded text
- Downloads bytes with our SSL session → uploads to Mistral Files API → gets signed URL → `mistral-ocr-latest` → joins pages as markdown
- `extract_bill_documents(documents_dict)` — runs OCR on all document types; returns `ocr_content` dict

**`scraper/utils.py`**
- `VOTE_MAP = {"DA": "for", "NU": "against", "AB": "abstain", "-": "absent"}`
- `slugify(name)` — NFD-normalised, ASCII-only slug — universal MP deduplication key
- `detect_status(text)` — keyword scan; current bills legitimately show `la_senat` (Chamber-voted, awaiting Senate)

### Bill JSON schema

```json
{
  "idp": 23048,
  "bill_number": "PL-x 91/2025",
  "title": "...",
  "initiator": {"name": "...", "type": "deputy"},
  "status": "la_senat",
  "documents": {
    "expunere_de_motive": "https://...",
    "forma_initiatorului": "https://...",
    "aviz_ces": "https://...",
    "aviz_cl": "https://..."
  },
  "registered_at": "2025-03-14",
  "adopted_at": null,
  "source_url": "https://...",
  "scraped_at": "2026-04-24T...",
  "ocr_content": {
    "expunere_de_motive": "... markdown text ...",
    "aviz_ces": "...",
    "aviz_cl": "..."
  },
  "vote_sessions": [
    {
      "idv": 12345,
      "type": "final",
      "date": "2026-04-22",
      "time": "17:32",
      "description": "PL-x 91/2025 ...",
      "summary": {"present": 280, "for": 240, "against": 15, "abstain": 8, "absent": 17},
      "by_party": [{"party": "PSD", "present": 100, "for": 95, "against": 0, "abstain": 5}],
      "nominal_votes": [{"mp_slug": "popescu-ion", "mp_name": "Popescu Ion", "party": "PSD", "vote": "for"}]
    }
  ],
  "ai_analysis": null
}
```

---

## Layer 2 — AI Agents

All agents: LangGraph `StateGraph`, `TypedDict` states in `agents/state.py`, prompts in `agents/prompts.py`.

### Run CLI

```bash
python run_agents.py --scout                          # all bills in data/raw/
python run_agents.py --scout --workers 4              # parallel Scout processing, capped at 4
python run_agents.py --scout --file bill_23048.json   # single bill
python run_agents.py --auditor                        # compute scores for all MPs
python run_agents.py --notifications                  # detect CDEP events + queue notification jobs
python run_agents.py --deliver-notifications          # dry-run queued jobs into local outbox
python run_agents.py --qa --file bill_23048.json      # interactive Q&A REPL
python run_agents.py --messenger --file bill_23048.json
python run_agents.py --all                            # scout + auditor
```

---

### Agent 1 — Legislative Scout (`agents/scout.py`)

**Model:** `mistral-small-latest` | **Graph nodes:** 7

```
load_bill → truncate_context → extract_structure → extract_opposition
         → compute_vote_metadata → assemble → save
```

- `truncate_context` — expunere: 8,000 chars, aviz: 4,000 chars
- `extract_structure` — LLM call (JSON mode) → title_short, key_ideas, impact_categories, affected_profiles, pro_args
- `extract_opposition` — LLM call on aviz text → con_args
- `compute_vote_metadata` — pure Python → controversy_score, passed_by (unanimous/comfortable/slim), dominant_party
- `save` — writes `ai_analysis` back into the bill JSON on disk

**`ai_analysis` output shape:**
```json
{
  "processed_at": "ISO datetime",
  "model": "mistral-small-latest",
  "title_short": "max 8 words",
  "key_ideas": ["...", "...", "..."],
  "impact_categories": ["sanatate", "fiscal"],
  "affected_profiles": ["angajat", "pacient"],
  "arguments": {"pro": [...], "con": [...]},
  "controversy_score": 0.05,
  "passed_by": "comfortable",
  "dominant_party": "PSD",
  "vote_date": "2026-04-22"
}
```

**Status:** done. All 11 bills processed.

---

### Agent 2 — Political Auditor (`agents/auditor.py`)

**Model:** `mistral-small-latest` | **Graph nodes:** 4

```
load_votes → calculate_scores → generate_narratives → save
```

- Loads all `nominal_votes` from every `bill_*.json`
- Score formula: `(participation × 0.6 + decisiveness × 0.4) × 100`
  - `participation = (total - absent) / total`
  - `decisiveness = (for + against) / total`
- Generates 2-sentence narrative per MP (only for MPs with ≥ 3 votes)
- Saves to `data/processed/impact_scores.json`, sorted by score desc

**Status:** done. 284 MPs scored, 9 categories: administratie, agricultura, educatie, fiscal, justitie, mediu, munca, sanatate, social.

---

### Agent 3 — Civic Q&A (`agents/qa.py`)

**Model:** `mistral-small-latest` | **Graph nodes:** 3 | **Max tokens:** 400

```
load_context → classify_intent → answer
```

- `classify_intent` — pure keyword router, no LLM cost. Maps to: `impact`, `vote_info`, `arguments`, `general`
- Context fed to LLM: title + key_ideas + PRO/CON + first 6,000 chars of OCR expunere
- Returns plain Romanian string

**Status:** done. Called live from `POST /qa` API endpoint.

---

### Agent 4 — Civic Messenger (`agents/messenger.py`)

**Model:** `open-mistral-nemo` (cheaper) | **Graph nodes:** 3

```
load_context → generate_email → return_draft
```

- Requires Scout to have run first (`ai_analysis` must exist)
- Returns `{"subject": "...", "body": "..."}` JSON
- Requires stance: `"support"` | `"oppose"`
- **Known fix applied (2026-04-25):** system prompt now explicitly anchors context to "Parlamentul României" to prevent country hallucination

**Status:** done. Called live from `POST /messenger` API endpoint.

---

### Agent 5 — Notifications / Watchdog (`agents/notifications.py`)

**Status:** MVP implemented. This agent is deterministic and does not call Mistral; it never sends email directly.

Graph:

```
detect_changes → classify_flags → match_users → compose_email → enqueue_send
```

Implemented responsibilities:
- Detects new local events from bill JSON: `new_bill`, `analysis_created`, `new_final_vote`.
- Assigns deterministic flags: `source:cdep`, `chamber:deputies`, `adopted_by_deputies`, `rejected_by_deputies`, `high_controversy`, `narrow_vote`, `government_initiative`, `needs_human_review`.
- Reuses Scout output for `category:<name>` and `profile:<name>` flags.
- Matches opt-in users from `data/processed/notification_preferences.json`.
- Queues draft jobs in `data/processed/notification_jobs.json`; no email provider integration yet.
- Stores event history in `data/processed/bill_events.json` so repeated runs only emit new events.
- Dry-run delivery writes `data/processed/notification_outbox.json` and `data/processed/notification_deliveries.json`, then marks jobs `sent_dry_run`.

MVP constraint:
- CDEP-only wording. Emails must say "Camera Deputaților voted..." or "based on Chamber of Deputies data", not "Parliament adopted..." unless Senate/final law status is known.
- Start with weekly digest or human-reviewed queued emails before real-time mass alerts.

Database tables in `db/schema.sql`:
- `users`
- `notification_preferences`
- `bill_events`
- `bill_flags`
- `notification_jobs`
- `notification_deliveries`
- `unsubscribe_tokens`

---

## Layer 3 — REST API (`api/main.py`)

FastAPI server reading from JSON files. No Supabase needed — works offline.

### Start

```bash
python -m uvicorn api.main:app --reload --port 8000
# Docs: http://localhost:8000/docs
```

### Endpoints

| Method | Path | Query params | Returns |
|--------|------|-------------|---------|
| `GET` | `/health` | — | server status, file counts |
| `GET` | `/stats` | — | bill counts, category map, avg MP score |
| `GET` | `/bills` | `category`, `party`, `page`, `size` | paginated bill summaries |
| `GET` | `/bills/{idp}` | — | full bill + key_ideas + arguments + vote breakdown |
| `GET` | `/bills/{idp}/votes` | `q`, `party`, `vote` | final vote session + searchable/filterable nominal votes |
| `GET` | `/mps` | `party`, `sort`, `page`, `size` | paginated MP scores |
| `GET` | `/mps/search` | `q`, `party`, `size` | MP search for composer/autocomplete |
| `GET` | `/mps/{mp_slug}` | — | MP detail + full vote history across all bills |
| `POST` | `/qa` | body: `{idp, question}` | `{answer}` — live Mistral call |
| `POST` | `/messenger` | body: `{idp, mp_name, user_name, stance}` | `{draft: {subject, body}}` — live Mistral call |
| `GET` | `/notifications/events` | `event_type`, `idp`, `limit` | detected bill events + flag records |
| `POST` | `/notifications/run` | body: `{preferences_path?}` | runs deterministic notification watchdog |
| `GET` | `/notifications/jobs` | `status`, `email`, `limit` | queued notification jobs for review/sending |
| `POST` | `/notifications/deliver` | body: `{limit}` | dry-run queued jobs into local outbox |

CORS is open (`allow_origins=["*"]`). The test UI (`index.html`) calls this API from `file://`.

**Status:** done. All 14 endpoints tested.

---

## Layer 4 — Database (`db/push_to_supabase.py`)

Ingestion script: reads all JSON files, upserts to Supabase in dependency order. Schema lives in `db/schema.sql`.

### Tables

| Table | PK | Content |
|-------|----|---------|
| `bills` | `idp` | metadata + OCR text columns |
| `vote_sessions` | `idv` | one row per plenary vote |
| `parliamentarians` | `mp_slug` | deduplicated MP registry |
| `mp_votes` | `(idv, mp_slug)` | individual votes |
| `ai_analyses` | `bill_idp` | Scout output |
| `impact_scores` | `mp_slug` | Auditor output |
| `users` | `user_id` | notification recipients + consent state |
| `notification_preferences` | `user_id` | categories/profiles/frequency/min importance |
| `bill_events` | `event_key` | detected CDEP bill events |
| `bill_flags` | `event_key` | deterministic flags and importance |
| `notification_jobs` | `job_id` | queued draft emails, not yet sent |
| `notification_deliveries` | `id` | dry-run and future email provider delivery logs |
| `unsubscribe_tokens` | `token` | future unsubscribe flow |

### Run ingestion

```bash
# .env must have SUPABASE_URL and SUPABASE_KEY
python db/push_to_supabase.py
python db/push_to_supabase.py --file bill_23048.json  # single bill
```

Notes:
- Full sync pushes impact scores after all parliamentarians are available.
- Single-file sync skips impact scores by default to avoid FK errors for MPs not present in that one bill.
- JSONB columns receive real JSON values, not stringified JSON.
- Full sync also pushes notification preferences/events/flags/jobs.
- Single-file sync skips notification data by default.

**Status:** schema + script done. Blocked on Supabase project creation and running `db/schema.sql`.

---

## Test UI (`index.html`)

Single-file vanilla JS app. Open directly in browser with API on port 8000. It also accepts an API override, e.g. `index.html?api=http://localhost:8001`.

| Screen | Features | Agent |
|--------|----------|-------|
| Home | CDEP-only scope note, stats cards, category filters, 5 recent bills | Scout |
| Bills | All bills, filter by category pill | Scout |
| Bill detail | Key ideas, PRO/CON, vote bar, party table, searchable nominal vote table | Scout |
| Q&A (in bill detail) | Text input → live answer | Q&A |
| Email composer (in bill detail) | Name + stance → live email draft | Messenger |
| MP leaderboard | 284 MPs, score bar, party filter, MP search | Auditor |
| MP detail (expand row) | Narrative + last 8 votes with colour-coded outcome | Auditor |
| Notifications | Run watchdog, inspect events/flags/jobs, dry-run delivery | Notifications |

---

## Environment Setup (full pipeline from scratch)

```bash
pip install -r requirements.txt

cp .env.example .env
# Edit .env — set MISTRAL_API_KEY (required), SUPABASE_URL + SUPABASE_KEY (optional)

python main.py --days 30 --max 20        # scrape bills from cdep.ro
python main.py --days 30 --skip-existing # incremental scrape; skip existing OCR/detail
python enrich_ocr.py                      # OCR all PDFs
python run_agents.py --scout              # analyse all bills
python run_agents.py --auditor            # score all MPs
python run_agents.py --notifications      # detect events + queue local notification jobs
python run_agents.py --deliver-notifications # dry-run notification delivery
python db/push_to_supabase.py             # push to Supabase (needs credentials)

python -m uvicorn api.main:app --reload --port 8000
# Open index.html in browser
```

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| One JSON file per bill | Decouples scraping from DB; agents work offline; trivial to inspect |
| `mp_slug` as universal MP key | cdep.ro has no stable MP IDs; slugified Romanian names are consistent |
| Mistral OCR via Files API (not direct URL) | cdep.ro SSL is broken; Mistral servers can't reach it directly |
| LangGraph `StateGraph` | Explicit graph; easy to add conditional branches without rewriting logic |
| `open-mistral-nemo` for Messenger | Email writing doesn't need strong reasoning; 10× cheaper than Small |
| Keyword intent router in Q&A | Zero latency, zero cost; simple vocabulary covers all intents |
| File-based API (no DB required) | Unblocks frontend development before Supabase is set up |
| CDEP-only MVP | Keep scope clear: the app reports Camera Deputaților votes, not full law adoption, until Senate support is added |
| Monorepo | Recommended for this stage: agents, scraper, API, DB migrations, and frontend should live together while contracts are still changing quickly |

---

## Next Steps — Brief for Next Agent

> Read this section fully before touching any code. Everything in the layers above is working. Don't modify the core agent logic unless a task below specifically says to.

### P0 — Do first (database + deployment unblockers)

**1. Run Supabase migration and test full sync**

`db/schema.sql` now exists. Backend team should run it once in the Supabase SQL editor, add `SUPABASE_URL` and `SUPABASE_KEY` to `.env`, then run:

```bash
python db/push_to_supabase.py
```

Expected result: bills, vote sessions, parliamentarians, MP votes, Scout analyses, and Auditor impact scores are all present in Supabase.

---

**2. Decide monorepo layout before adding frontend**

Recommendation: use a monorepo for this stage. Keep scraper, agents, API, DB migrations, and frontend in one repo so shared contracts (`bill` shape, `ai_analysis`, categories, flags, API response models) evolve together.

Suggested target layout:

```text
apps/
  api/                 # FastAPI app
  web/                 # React/Next.js frontend
packages/
  agents/              # LangGraph agents
  scraper/             # cdep.ro scraper + OCR
  shared/              # schemas, constants, category/flag definitions
db/
  schema.sql
  migrations/
data/
  raw/
  processed/
```

Do not over-package immediately; first move only when the frontend starts depending on backend contracts.

---

### Remaining Scraper + Agent Implementation

This section is strictly about scraper and agent work, not frontend/backend polish.

#### Scraper P0

**1. Fix CDEP status parsing**

Current `status` is unreliable and often shows `la_senat`. Parse the specific legislative status row/table from the CDEP bill detail page instead of scanning the whole page text.

Files:
- `scraper/parsers.py`
- `scraper/utils.py`

**2. Emit explicit scraper events**

Agent 5 currently infers events from bill JSON. Better scraper behavior:
- New bill file created → `new_bill`
- New final vote appended → `new_final_vote`
- Status/documents changed → `status_changed` / `documents_changed`

Likely files:
- `scraper/cdep.py`
- optional new `scraper/events.py`

**3. Add metadata refresh for existing bills**

`--skip-existing` is fast but can miss status/document changes. Add a lighter refresh mode that fetches the detail page, compares status/doc URLs, and skips OCR unless documents changed.

Desired flags:
- `--skip-existing` keeps current behavior
- `--refresh-metadata` fetches detail page for existing bills, but avoids OCR unless document URLs changed

#### Agent P0

**4. Add retries to Scout LLM calls**

Auditor already retries narrative failures. Scout should also retry `extract_structure` and `extract_opposition` once after a short delay to avoid losing a bill analysis on transient Mistral errors.

Files:
- `agents/scout.py`

**5. Improve Notification Agent event semantics**

Current events:
- `new_bill`
- `analysis_created`
- `new_final_vote`

Add:
- `status_changed`
- `documents_changed`
- `analysis_changed`
- `category_changed`

This needs previous bill snapshots or content hashes.

Files:
- `agents/notifications.py`
- optional `data/processed/bill_snapshots.json`

**6. Add notification dedupe by content hash**

Current dedupe uses event keys. Add hash-based dedupe for status/doc/analysis changes so users are not alerted when content did not meaningfully change.

#### Agent P1

**7. Make Notification Agent Supabase-native**

Current Agent 5 uses local JSON. Later it should optionally:
- read users/preferences from Supabase
- read prior events from Supabase
- upsert events, flags, and jobs directly to Supabase

Keep JSON mode for local development.

Files:
- `agents/notifications.py`
- `api/main.py`
- `db/push_to_supabase.py`

**8. Real email delivery mode**

Current delivery is dry-run only. Add provider mode later:
- Resend/Postmark/SendGrid
- `dry_run=True/False`
- retry failed sends
- update job status and delivery logs

Files:
- `agents/notification_delivery.py`

**9. Agent quality evals**

Add small regression checks for:
- Scout returns valid categories/profiles
- Messenger stays Romania/CDEP-specific
- Notification flags match expected rules
- Delivery worker never sends without opt-in

#### Agent P2

**10. Q&A streaming**

Replace synchronous Mistral calls in `agents/qa.py` with streaming and expose a FastAPI `StreamingResponse`.

**11. Parallel OCR**

OCR will become slow as bill count grows. Add limited concurrency, probably max 2-4, while respecting Mistral rate limits.

#### Deferred Scraper

**12. Senate scraping (`cam=2`)**

Not required for current CDEP MVP. Required later for full Romanian legislative lifecycle tracking.

---

### P1 — High value

**3. Swap API data layer to Supabase**

Once Supabase credentials exist, replace the JSON-file reads in `api/main.py` with Supabase queries. The function signatures (`_load_bills()`, `_load_impact_scores()`, `_bills_by_idp()`) are already isolated — only those three functions need updating. Everything else (endpoints, agent calls) stays the same.

Pattern:
```python
from supabase import create_client
_DB = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

def _load_bills():
    return _DB.table("bills").select("*, ai_analyses(*)").execute().data
```

---

### P2 — Nice to have

**4. Add real email provider integration**

Queued jobs and dry-run delivery are implemented, but real emails are not sent yet. Add an email provider integration (Resend/Postmark/SendGrid), send only reviewed/eligible jobs, then write `notification_deliveries` rows and update job status.

Guardrails:
- Require `email_opt_in=true`.
- Include one-click unsubscribe.
- Keep human review mode before enabling automatic mass sends.

---

### Deferred

**Agent 6 — Weekly Digest**

Every Monday, reads all bills scraped in the past 7 days, generates a 5-sentence Romanian summary of the week's legislative activity by category, and returns it as structured JSON for a newsletter/push notification.

---

### Known bugs to fix

| Bug | Location | Fix |
|-----|----------|-----|
| `status` all shows `la_senat` | `scraper/utils.py:detect_status` | Parse the specific "Stadiu legislativ" table row instead of full-page text scan |
| `adopted_at` is often `null` | `scraper/parsers.py:_extract_dates` | The regex only matches dates before "adoptare/lege nr." keywords; those strings don't appear for bills still in progress — correct behaviour, not a bug |
