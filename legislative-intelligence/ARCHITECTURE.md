# CivicMind — Architecture & Implementation Status

> Last updated: 2026-04-25  
> Stack: Python 3.11 · Mistral AI · LangGraph · FastAPI · Supabase · React (pending)

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
| REST API (FastAPI) | ✅ Done | 26 endpoints, file-based + expanded RAG admin/eval/inspection endpoints available |
| Test UI | ✅ Done | `index.html` — single file, vanilla JS |
| Supabase ingestion script | ✅ Done | Pushes bills, votes, AI analyses, impact scores, notification preferences/events/flags/jobs |
| Supabase SQL migration | ✅ Done | `db/schema.sql` and `db/schema_rag.sql` applied in Supabase |
| Supabase tables | ✅ Done | `schema.sql` and `schema_rag.sql` applied in Supabase on 2026-04-25 |
| Agent 5 — Notifications | ✅ MVP Done | Deterministic watchdog + flag classifier + local job queue + dry-run delivery |
| RAG Agent — Legislative Text Similarity Chat | 🛠️ Infra Live | Supabase vector schema applied, local bills indexed, first 300 discovered 2025 Portal Legislativ acts indexed, baseline eval harness live |
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
│       ├── eval_rag.py             # baseline RAG retrieval regression runner
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
│       │   ├── rag.py               # RAG chat wrapper + planned LangGraph ReAct builder
│       │   ├── rag_tools.py         # Supabase vector search / query embedding helpers
│       │   └── notification_delivery.py # Dry-run notification delivery worker
│       │
│       ├── api/
│       │   └── main.py              # FastAPI — reads from data/ JSON files, wraps agents
│       │
│       ├── db/
│       │   ├── schema.sql           # Supabase migration
│       │   ├── schema_rag.sql       # pgvector tables/functions/indexes for RAG
│       │   └── push_to_supabase.py  # Upserts all JSON data into Supabase tables
│       ├── evals/
│       │   └── rag_queries.json     # small retrieval regression set for the live vector corpus
│       ├── notification_preferences.example.json  # Example opt-in preferences for Agent 5
│       │
│       └── data/
│           ├── raw/                 # bill_XXXXX.json — one file per bill (gitignored)
│           └── processed/
│               ├── impact_scores.json  # Auditor output — 284 MPs, sorted by score desc
│               └── rag_eval_last.json  # latest local retrieval eval report
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

### RAG Agent — Legislative Text Similarity Chat (`agents/rag.py`)

**Status:** infrastructure live. This is a separate RAG/search agent, not a replacement for Agent 3 Q&A. Agent 3 answers questions about one selected bill; the RAG agent searches the whole legislative corpus and returns similar legislative chunks with citations.

Implemented:
- `db/schema_rag.sql` — Supabase pgvector tables, HNSW cosine index, and `match_legislation_chunks()` RPC.
- `scraper/legislatie_just.py` — SOAP client for Portal Legislativ `GetToken` and `Search`.
- `rag_index.py` — local bill and Portal Legislativ indexing pipeline with dry-run, content hashes, and Mistral embeddings.
- `agents/rag_tools.py` — query embedding, bill-context lookup, bill-to-corpus comparison, document/chunk drill-down, hybrid reranking, result diversification, source inference, and query logging helpers.
- `agents/rag.py` — grounded chat wrapper plus `build_react_rag_agent()` for the planned LangGraph prebuilt ReAct chatbot.
- `eval_rag.py` + `evals/rag_queries.json` — repeatable retrieval regression harness plus a small live baseline query set.
- API endpoints: `GET /rag/health`, `POST /rag/search`, `POST /rag/chat`, `GET /rag/bills/{idp}/context`, `POST /rag/bills/compare`, `GET /rag/chunks/{chunk_id}/excerpt`, `POST /rag/explain-match`, `POST /rag/reindex`, `POST /rag/eval`, `GET /rag/eval-report`.
- `env_setup.py` — loads both `legislative-intelligence/.env` and `backend/.env`, and maps `SUPABASE_SERVICE_ROLE_KEY` to `SUPABASE_KEY` for server-side tooling.

Executed on 2026-04-25:
- Applied `db/schema.sql` and `db/schema_rag.sql` to Supabase.
- Applied SQL through the Supabase IPv4 pooler (`aws-0-eu-west-1.pooler.supabase.com:5432`) because the direct `db.<project-ref>.supabase.co` hostname was IPv6-only from this environment.
- Verified `legislation_documents`, `legislation_chunks`, and `match_legislation_chunks()` through Supabase REST.
- Synced all 11 local Chamber bill files and 284 impact scores into Supabase.
- Indexed all local Chamber bill RAG documents into Supabase.
- Indexed the first 200 discovered Portal Legislativ 2025 acts with `--changed-only`, resulting in a live mixed corpus from `legislatie-just` and `cdep`.
- Expanded the Portal Legislativ 2025 slice to the first 300 discovered acts with `--changed-only`.
- Verified live retrieval and chat; tightened the RAG prompt so it does not suggest laws outside retrieved context.
- Added adaptive embedding-batch splitting and retry/backoff for Mistral capacity errors in `rag_index.py`.
- Added light retry/backoff for query embeddings in `agents/rag_tools.py`, so search/chat/eval are less likely to fail on transient free-tier Mistral 429s.
- Added `POST /rag/reindex` so indexing can be triggered through FastAPI without dropping back to the terminal.
- Added real RAG helper tools for:
  - `get_bill_context(idp)`
  - `compare_bill_to_corpus(idp, top_k)`
  - `get_document_by_id(document_id)`
  - `get_chunk_by_id(chunk_id)`
  - result diversification / dedupe
  - lightweight source inference (`cdep` vs `legislatie-just`)
  - query logging into `rag_query_logs`
- Added RAG API drill-down endpoints for document/chunk inspection and bill-based similarity.
- Added a lightweight hybrid reranker after vector search (`vector_similarity` + lexical/title overlap) plus slightly stronger source/document diversity caps.
- Added exact excerpt extraction for one indexed chunk plus a query-aware "why this matched" explainer for UI/debugging and future follow-up chat turns.
- Added a baseline retrieval eval harness that writes `data/processed/rag_eval_last.json`.
- Added `POST /rag/eval` and `GET /rag/eval-report` for admin/debug evaluation runs.
- Verified live chat path with `run_rag_chat()`.

Vector DB / semantic search verification on 2026-04-25:
- `rag_health()` returned a live corpus in Supabase after the 300-act slice expansion: 340 documents, 1901 chunks, latest source `legislatie-just`.
- Raw vector search through `match_legislation_chunks()` returned plausible ranked results for multiple queries:
  - `achizitii publice control ex ante` still underperforms and surfaces only weak matches; this is currently a corpus/ranking gap, not a broken vector DB.
  - `ordin ministrul sanatatii asigurari sociale` returned `legislatie-just` health orders with the right Ministry/CNAS family.
  - `proiect de lege guvernului camera deputatilor vot final` returned `cdep` bill chunks as expected.
- `run_rag_chat()` produced grounded answers using retrieved sources for:
  - public procurement / control ex ante
  - health / social insurance text similarity
  - bill-detail similarity mode using `bill_idp`, now defaulting to `cdep` when no explicit source is passed
- `python eval_rag.py` now gives a repeatable retrieval baseline. Current baseline on the live corpus: 4/5 cases passed (80.0%), average top similarity `0.7995`.
- The one failing case is currently `procurement_control_ex_ante`, which we are treating as a real known gap in corpus coverage/ranking quality.
- Conclusion: the vector DB, pgvector RPC, embeddings pipeline, and semantic retrieval are operational.
- Important caveat: retrieval quality is improving, but not yet production-tuned. The system now has a measurable baseline, not just spot checks, and still needs better coverage and ranking for harder topical queries.

Important migration note:
- Existing Supabase projects may already contain an older `ai_analyses` table definition.
- `db/schema.sql` now includes additive `alter table ... add column if not exists ...` statements for the newer Scout fields (`title_short`, `arguments`, `controversy_score`, `passed_by`, `dominant_party`, `vote_date`).
- `db/schema.sql` also includes additive `alter table ... add column if not exists ...` statements for legacy `impact_scores` tables (`mp_name`, `party`, `categories_voted`, `narrative`).
- This avoids `create table if not exists` silently leaving older projects behind.

**Framework:** LangGraph prebuilt ReAct chatbot using `create_react_agent`.

**Purpose:**
- Power the website's Chat section with an embeddable conversational interface.
- Let users ask cross-bill questions such as "ce proiecte seamănă cu acesta?", "unde mai apare aceeași obligație?", "ce legi afectează PFA-urile?", or "găsește texte similare despre sănătate".
- Use cosine similarity over embedded chunks to retrieve the most relevant passages, then answer only from retrieved context.

**Recommended stack:**
- Vector DB: Supabase Postgres with the `pgvector` extension, because Supabase is already the planned production database and pgvector supports vector storage, indexes, filtering, and cosine distance in SQL.
- Embeddings: Mistral `mistral-embed`, because the project already uses Mistral and the model returns 1024-dimensional text vectors.
- Similarity: cosine distance via pgvector's `<=>` operator; expose returned similarity as `1 - cosine_distance`.
- Chat model: keep `mistral-small-latest` for grounded answers unless latency/cost forces `open-mistral-nemo`; retrieval quality should depend on embeddings, not on the chat model.

**Official source decision for the full Romanian legislation corpus:**
- Primary source: Ministerul Justiției — Portal Legislativ (`https://legislatie.just.ro`).
- Reason: this is the official free national legislation portal, with updated/consolidated acts, programmatic access, 150,000+ normative acts, daily updates, and N-Lex/EU interconnection.
- Programmatic endpoint: `http://legislatie.just.ro/apiws/FreeWebService.svc/SOAP`.
- WSDL: `http://legislatie.just.ro/apiws/FreeWebService.svc?singleWsdl`.
- Verified operations:
  - `GetToken()` returns a temporary token.
  - `Search(SearchModel, tokenKey)` returns paginated `Legi` records.
- WSDL `SearchModel` fields:
  - `NumarPagina`
  - `RezultatePagina`
  - `SearchAn`
  - `SearchNumar`
  - `SearchText`
  - `SearchTitlu`
- WSDL `Legi` result fields:
  - `DataVigoare`
  - `Emitent`
  - `LinkHtml`
  - `Numar`
  - `Publicatie`
  - `Text`
  - `TipAct`
  - `Titlu`
- Detail HTML source: `LinkHtml`, usually `http://legislatie.just.ro/Public/DetaliiDocument/{document_id}`.
- Secondary validation/backfill source: Consiliul Legislativ / Repertoriul legislativ, which EU e-Justice describes as covering 1864-present. Use it only for validation/backfill unless its access surface is more stable than Portal Legislativ.
- Do not use Monitorul Oficial as the main ingestion source for MVP. It is the official publication channel, but Portal Legislativ is better for consolidated text, search, and free programmatic access.

**Legislation-source ingestion plan:**
- Add `scraper/legislatie_just.py` or `sources/legislatie_just.py`.
- Add CLI:

```bash
python rag_index.py --source legislatie-just --year 2025
python rag_index.py --source legislatie-just --from-year 1989 --to-year 2026
python rag_index.py --source legislatie-just --changed-only
```

- Discovery strategy:
  - Get SOAP token.
  - For each year, call `Search` with `SearchAn=<year>`, empty `SearchTitlu`, `SearchText`, and `SearchNumar`.
  - Page with `NumarPagina` until an empty result page.
  - Use conservative `RezultatePagina` such as 50-100.
  - Dedupe by `LinkHtml` document ID and a normalized title/type/number/year key.
- Text strategy:
  - Store `Legi.Text` as the first raw full-text source because it is returned directly by the API.
  - Fetch `LinkHtml` when richer structure is needed: table of contents, article anchors, consolidated/base-form options, and relation metadata.
  - Parse article-level structure from detail HTML where possible; fall back to chunking `Legi.Text`.
- Scope:
  - MVP: national Romanian normative acts available from Portal Legislativ, especially 1989-present plus relevant pre-1989 acts exposed by the portal.
  - Later: validate 1864-present coverage against Consiliul Legislativ, add EU transposition links from N-Lex/EUR-Lex, and add Monitorul Oficial identifiers as citations.
- Legal/data-use note:
  - Official legislative texts are generally not copyright-protected as creative works, but Portal Legislativ's site terms and redistribution constraints still need a quick legal/product review before exposing bulk text downloads.
  - Product should expose citations and short relevant snippets, not a bulk mirror of the entire portal.

**Corpus to index ("whole legislation" for MVP):**
- All national Romanian normative acts discovered from Portal Legislativ via SOAP `Search`, using `Legi.Text` and `LinkHtml` as the canonical corpus.
- Every `data/raw/bill_*.json` bill title, bill number, status, initiator, dates, categories, affected profiles, and Scout `ai_analysis`.
- All OCR text in `ocr_content`, split by document type:
  - `expunere_de_motive`
  - `forma_initiatorului`
  - `forma_adoptata`
  - `aviz_ces`
  - `aviz_cl`
  - any future document URLs discovered by the scraper
- Vote-session descriptions and final-vote metadata as low-priority metadata, not primary legal text.
- Future expansion: Senate documents (`cam=2`), promulgated law text, Monitorul Oficial references, amendment text, committee reports, and official consolidated law text where available.

**Do not index as primary semantic chunks:**
- Full nominal vote tables; store them as structured metadata and retrieve through existing MP/vote endpoints.
- Generated Messenger email drafts.
- Notification jobs, deliveries, or user preference data.

**Chunking plan:**
- Normalize OCR markdown, remove repeated headers/footers, preserve Romanian diacritics.
- Chunk per bill document, not across documents.
- Target 800-1,200 tokens per chunk with 100-150 token overlap.
- Preserve citation metadata on every chunk: `bill_idp`, `bill_number`, `title`, `document_type`, `source_url`, optional `page_start/page_end`, `chunk_index`, `text_hash`, `scraped_at`.
- Add a short metadata prefix before embedding, e.g. `PL-x 91/2025 | expunere_de_motive | sănătate, fiscal | ...`, so similarity can use legal context without burying the passage.

**Database plan (`db/schema_rag.sql`, planned):**

```sql
create extension if not exists vector with schema extensions;

create table public.legislation_documents (
    document_id text primary key,
    bill_idp bigint references public.bills(idp) on delete cascade,
    bill_number text,
    document_type text not null,
    source_url text,
    content_hash text not null,
    metadata jsonb not null default '{}'::jsonb,
    indexed_at timestamptz not null default now()
);

create table public.legislation_chunks (
    chunk_id text primary key,
    document_id text references public.legislation_documents(document_id) on delete cascade,
    bill_idp bigint references public.bills(idp) on delete cascade,
    chunk_index int not null,
    content text not null,
    content_hash text not null,
    embedding extensions.vector(1024) not null,
    metadata jsonb not null default '{}'::jsonb,
    indexed_at timestamptz not null default now()
);

create index idx_legislation_chunks_bill_idp on public.legislation_chunks(bill_idp);
create index idx_legislation_chunks_metadata on public.legislation_chunks using gin(metadata);
create index idx_legislation_chunks_embedding_hnsw
    on public.legislation_chunks
    using hnsw (embedding vector_cosine_ops);
```

Add a SQL RPC:

```sql
match_legislation_chunks(
    query_embedding extensions.vector(1024),
    match_threshold float,
    match_count int,
    filter_bill_idp bigint default null,
    filter_document_type text default null
)
```

The function should order by `embedding <=> query_embedding asc`, return `similarity = 1 - (embedding <=> query_embedding)`, and cap `match_count` to a safe maximum such as 30.

**Indexing pipeline plan:**
- New CLI: `python rag_index.py --all`, `python rag_index.py --file bill_23048.json`, `python rag_index.py --changed-only`.
- Read bill JSON locally first; later read from Supabase once API data layer is Supabase-native.
- Generate stable `document_id = "{idp}:{document_type}"`.
- Generate stable `chunk_id = "{document_id}:{chunk_index}:{content_hash[:12]}"`.
- Skip unchanged documents by comparing `content_hash`.
- Batch calls to Mistral embeddings API.
- Upsert documents/chunks into Supabase.
- Delete stale chunks when a document hash changes.
- If an embedding batch exceeds Mistral token limits, recursively split the batch.
- If Mistral returns temporary capacity errors, retry with backoff.
- `--changed-only` also reindexes documents that exist without chunk rows, which recovers cleanly from interrupted runs.

Implemented CLI:

```bash
python rag_index.py --source bills --all --dry-run
python rag_index.py --source bills --file bill_23048.json
python rag_index.py --source legislatie-just --year 2025 --limit 100 --dry-run
python rag_index.py --source legislatie-just --from-year 1989 --to-year 2026 --changed-only
```

Before non-dry-run indexing:
- run `db/schema.sql`
- run `db/schema_rag.sql`
- set `MISTRAL_API_KEY`, `SUPABASE_URL`, and `SUPABASE_KEY`

Current live corpus in Supabase after indexing on 2026-04-25:
- `legislation_documents`: 239
- `legislation_chunks`: 1216
- sources present: `legislatie-just`, `cdep`
- `rag_query_logs`: live inserts verified

Current known retrieval limitations:
- Search still can over-return related chunks from the same bill family, but exact same-document duplication is now reduced in `agents/rag_tools.py`.
- Ranking is still mainly cosine similarity; there is light post-filtering/diversification, but no proper reranker or MMR scoring layer yet.
- `legislatie-just` text is chunked from API text, not yet from parsed article-level HTML structure.
- Citation quality is acceptable for debugging but not yet polished for citizen-facing UI.
- `POST /rag/chat` is currently synchronous; streaming remains planned.
- Source inference is heuristic right now; it works for obvious cases but is not a learned router.

**Agent/tool plan:**

```text
Website Chat
  → POST /rag/chat
  → agents/rag.py LangGraph prebuilt ReAct chatbot
  → tools:
      search_legislation_chunks(query, filters, top_k)
      get_bill_context(idp)
      compare_bill_to_corpus(idp, top_k)
  → Supabase RPC match_legislation_chunks()
  → answer with citations
```

ReAct tools:
- `search_legislation_chunks`: embeds user query with `mistral-embed`, calls Supabase RPC, returns top chunks.
- `get_bill_context`: fetches existing bill summary/AI analysis/vote metadata for citation context. Implemented.
- `compare_bill_to_corpus`: embeds a selected bill's title + key ideas + document chunks, finds similar chunks in other bills, excludes same `idp` by default. Implemented.
- `get_document_by_id`: fetches one indexed document by `document_id`. Implemented.
- `get_chunk_by_id`: fetches one indexed chunk and its parent document by `chunk_id`. Implemented.
- `get_chunk_excerpt`: extracts the most relevant sentences from one chunk, optionally focused by query terms. Implemented.
- `explain_chunk_match`: shows why one chunk matched one query, including overlap terms and current rank/score. Implemented.

Implementation status of the RAG agent itself:
- Current live path: `run_rag_chat()` in `agents/rag.py` performs retrieval + grounded answer generation.
- `run_rag_chat()` now also:
  - infers source in obvious cases
  - switches to bill-comparison mode when the user asks for similar laws from a bill context
  - defaults bill-similarity mode to `cdep` unless explicitly overridden
- `search_legislation_chunks()` now applies a lightweight hybrid rerank on top of cosine similarity and then a source/document diversity pass.
- Baseline retrieval evals are now real code, not a TODO:
  - `eval_rag.py`
  - `evals/rag_queries.json`
  - `data/processed/rag_eval_last.json`
- Current scaffold: `build_react_rag_agent()` exists as the LangGraph prebuilt ReAct entry point and now includes multiple live tools (`search_legislation`, `bill_context`, `compare_bill`, `document_detail`, `chunk_detail`).
- Therefore the full "agent" is still not done yet; the current product is a working retrieval-backed chatbot plus a partially tooled ReAct scaffold, not yet a fully orchestrated conversational assistant.

RAG agent implementation plan:
1. Tool expansion
- Add tool support for multi-step citation follow-up, e.g. "open source 2" / "show the exact paragraph behind this answer" across turns, not only as a single direct helper call.
- Wire the new excerpt/explanation helpers into frontend follow-up UX so users can inspect sources without dropping to raw JSON.

2. Retrieval quality layer
- Improve dedupe across same `bill_idp` / closely related document families beyond the current lightweight caps.
- Replace the current lightweight hybrid rerank with either MMR or a better source-diversity reranker after vector search.
- Replace heuristic source-aware routing with a more explicit router or classifier.
- Add stricter confidence thresholds per mode so weak matches return "not enough evidence".

3. Agent behavior
- Use the ReAct agent only when tool selection is genuinely useful.
- Keep direct retrieval mode for simple questions to reduce latency/cost.
- Add conversation-aware follow-up handling so "this act" or "compare with the previous result" works across turns.

4. Evaluation
- Expand the current 5-case regression set toward 20-50 Romanian queries across: fiscal, sanatate, munca, justitie, administratie, achizitii.
- Track precision of top-5 retrieval manually at first; current baseline is only a smoke/regression suite, not a benchmark.
- Keep logging query, chosen mode, returned chunk IDs, and answer confidence in `rag_query_logs`.

System prompt requirements:
- Answer in Romanian by default.
- Use only retrieved chunks and existing bill metadata.
- Cite `bill_number`, `document_type`, and `source_url` for every substantive claim.
- If retrieved chunks are weak or below threshold, say that no strong match was found.
- Preserve CDEP-only scope until Senate/full-law data is indexed.

**Current API surface:**
- `POST /rag/search` → raw semantic search results for debugging and UI sidebars.
- `POST /rag/chat` → grounded chat response for the website Chat section.
- `GET /rag/chunks/{chunk_id}/excerpt` → fetches the most relevant sentences from one stored chunk.
- `POST /rag/explain-match` → explains why a stored chunk matched a given query.
- `POST /rag/reindex` → admin-only local trigger for changed bills.
- `POST /rag/eval` → admin/debug trigger for the baseline retrieval suite.
- `GET /rag/eval-report` → latest saved retrieval eval report.
- `GET /rag/health` → chunk counts, embedding model, last indexed timestamp.

**Frontend plan:**
- Embed as the app's Chat section, not a separate landing page.
- Initial modes:
  - "Întreabă legislația" — user asks an open question across all indexed bills.
  - "Găsește proiecte similare" — starts from the current bill detail page and calls `compare_bill_to_corpus`.
- Show citations as compact source chips linking back to bill detail/document source.
- Show "CDEP-only MVP" scope note in the chat footer.

**Evaluation plan:**
- Golden queries for categories: fiscal, sănătate, educație, muncă, justiție.
- Check that top-5 retrieval includes known related bills.
- Check that no answer is produced without citations.
- Check same-bill exclusion for similarity mode.
- Track query, returned chunk IDs, similarity scores, and user feedback in `rag_query_logs` later.

**Open decisions before implementation:**
- Whether to use only raw OCR text for embeddings or include Scout summaries in the embedded text. Recommendation: include Scout summaries as metadata prefix, but keep raw legal text as the chunk body.
- Whether to keep `schema_rag.sql` separate or merge into `db/schema.sql`. Recommendation: separate during development, merge once stable.
- Whether chat history should be persisted. Recommendation: start stateless with short frontend history; add user-level persistence only after auth/privacy decisions.

---

## Layer 3 — REST API (`api/main.py`)

FastAPI server reading core bill/MP data from JSON files. Most non-RAG endpoints work offline; the RAG endpoints require Supabase + Mistral credentials.

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
| `GET` | `/rag/health` | — | RAG corpus counts, embedding model, latest indexed source |
| `POST` | `/rag/search` | body: `{query, top_k, threshold, source?, bill_idp?, document_type?, exclude_bill_idp?}` | raw semantic search results from Supabase pgvector |
| `POST` | `/rag/chat` | body: `{question, top_k, threshold, source?, bill_idp?, exclude_bill_idp?}` | grounded RAG answer + cited source chunks |
| `GET` | `/rag/bills/{idp}/context` | — | structured local Chamber bill context for the RAG agent |
| `POST` | `/rag/bills/compare` | body: `{idp, top_k, threshold, source?}` | similar corpus matches for a selected Chamber bill |
| `GET` | `/rag/documents/{document_id}` | — | one indexed legislation document by `document_id` |
| `GET` | `/rag/chunks/{chunk_id}` | — | one indexed chunk plus its parent document |
| `GET` | `/rag/chunks/{chunk_id}/excerpt` | `query`, `sentences`, `max_chars` | focused excerpt from one indexed chunk |
| `POST` | `/rag/explain-match` | body: `{query, chunk_id, source?, bill_idp?, document_type?, exclude_bill_idp?}` | explains why a specific chunk matched a query |
| `POST` | `/rag/reindex` | body: `{source, year?, limit?, changed_only?, dry_run?, ...}` | triggers `rag_index.py` from the API server |
| `POST` | `/rag/eval` | body: `{cases?, limit?, report?}` | runs the baseline retrieval eval suite and returns the latest report |
| `GET` | `/rag/eval-report` | — | latest saved retrieval eval report from `data/processed/rag_eval_last.json` |
| `GET` | `/notifications/events` | `event_type`, `idp`, `limit` | detected bill events + flag records |
| `POST` | `/notifications/run` | body: `{preferences_path?}` | runs deterministic notification watchdog |
| `GET` | `/notifications/jobs` | `status`, `email`, `limit` | queued notification jobs for review/sending |
| `POST` | `/notifications/deliver` | body: `{limit}` | dry-run queued jobs into local outbox |

CORS is open (`allow_origins=["*"]`). The test UI (`index.html`) calls this API from `file://`.

**Status:** done. 26 endpoints available; expanded RAG endpoints smoke-tested locally.

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
| `legislation_documents` | `document_id` | live RAG source documents from `cdep` and `legislatie-just` |
| `legislation_chunks` | `chunk_id` | live RAG chunks with `mistral-embed` vectors |
| `rag_query_logs` | `id` | live search/chat telemetry and evaluation traces |

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

**1. Supabase migration and full sync — done**

`db/schema.sql` and `db/schema_rag.sql` have been applied in Supabase, and full sync has already been exercised from this workspace. The remaining database work is operational hardening and moving more runtime reads from local JSON to Supabase.

```bash
python db/push_to_supabase.py
```

Result: bills, vote sessions, parliamentarians, MP votes, Scout analyses, Auditor impact scores, and RAG tables are present in Supabase.

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

### P0 — RAG foundation (implemented; continue tuning)

**3. Add Supabase pgvector migration for legislative RAG — done and applied**

`db/schema_rag.sql` now exists with:
- `vector` extension enabled in `extensions`
- `legislation_documents`
- `legislation_chunks`
- HNSW cosine index on `embedding vector(1024)`
- `match_legislation_chunks()` RPC using cosine distance (`<=>`)

Keep this separate from `db/schema.sql` until the schema settles.

---

**4. Add RAG indexing script — MVP done**

`rag_index.py` now exists.

Inputs:
- Portal Legislativ SOAP `Search` results from `legislatie.just.ro`
- `Legi.Text` and `Legi.LinkHtml` detail pages for national normative acts
- `data/raw/bill_*.json`
- OCR text from all `ocr_content` document types
- bill metadata and Scout summaries as metadata/prefix context

Outputs:
- document rows
- chunk rows
- Mistral `mistral-embed` vectors

Required modes:

```bash
python rag_index.py --all
python rag_index.py --changed-only
python rag_index.py --file bill_23048.json
```

The script must be idempotent using content hashes.

---

**5. Add LangGraph ReAct RAG chatbot — skeleton done, tuning pending**

Created:
- `agents/rag.py`
- `agents/rag_tools.py`

Use LangGraph's prebuilt ReAct chatbot (`create_react_agent`) with tools for:
- semantic chunk search
- bill context lookup
- selected-bill similarity search

Exposed through FastAPI:
- `POST /rag/search`
- `POST /rag/chat`
- `POST /rag/reindex`
- `GET /rag/health`

The website Chat section should call `/rag/chat` and render citations.

---

### Remaining Scraper + Agent Implementation

This section is strictly about scraper and agent work, not frontend/backend polish.

#### Scraper P0

**1. CDEP status parsing — done**

The parser now extracts the specific legislative-status row/table instead of scanning the whole page text. Keep this area stable while working on the next scraper tasks.

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
| `adopted_at` is often `null` | `scraper/parsers.py:_extract_dates` | The regex only matches dates before "adoptare/lege nr." keywords; those strings don't appear for bills still in progress — correct behaviour, not a bug |
