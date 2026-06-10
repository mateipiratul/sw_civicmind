# TODO: Legislative Intelligence Refactoring

This checklist tracks the resolution of code smells and architectural issues identified in the `legislative-intelligence` codebase.

- [x] **1. API Route & I/O Optimizations**
  - [x] Consolidate file scanning: Avoid scanning/parsing all JSON bill files from disk on every API call.
  - [x] Implement query caching (e.g. using `lru_cache` in [api/main.py](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/api/main.py) or routing requests directly to the Supabase database).
  - [x] Optimize [get_mp](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/api/main.py#L320) endpoint to avoid nested O(N*M*K) loops in memory.

- [x] **2. Consolidate Supabase Client factories (DRY)**
  - [x] Create a single, shared Supabase client module under `db/client.py` (or similar).
  - [x] Replace custom factory functions in:
    - [agents/rag_tools.py](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/agents/rag_tools.py) (`get_supabase`)
    - [personalization.py](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/personalization.py) (`_db`)
    - [rag_index.py](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/rag_index.py) (`_supabase`)
    - [db/push_to_supabase.py](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/db/push_to_supabase.py) (`get_client`)
  - [x] Implement client reuse/singleton pattern to avoid creating clients repeatedly.

- [x] **3. Optimize DB Access & Ensure Transactional Integrity**
  - [x] Batch database queries in [rag_index.py](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/rag_index.py) (`_filter_changed`) to eliminate the N+1 query pattern.
  - [x] Batch upsert operations in [db/push_to_supabase.py](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/db/push_to_supabase.py) (`push_bill`) rather than executing separate sequential network requests in loops.
  - [x] Ensure proper transaction boundaries so failures during sync/index do not leave the DB in a corrupted state.

- [x] **4. Refactor / Simplify Agent Workflows**
  - [x] Cache/compile agent graphs once at the module level rather than on every invocation.
  - [x] Simplify linear agent flows in Scout, Auditor, QA, and Messenger (remove LangGraph state machine overhead if flows remain completely linear).
  - [x] Clean up dead code, such as the unused `intent` field in [agents/qa.py](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/agents/qa.py).

- [x] **5. Asynchronous Event Loop & Concurrency Enhancements**
  - [x] Run sequential LLM calls in [agents/auditor.py](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/agents/auditor.py) (`generate_narratives`) concurrently using `asyncio.gather`.
  - [x] Offload long-running subprocess runs in [api/main.py](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/api/main.py) (reindexing/evaluation) to FastAPI `BackgroundTasks` or a task queue.

- [x] **6. Clean up OCR Temporary Uploads**
  - [x] Modify [scraper/pdf_ocr.py](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/scraper/pdf_ocr.py) (`ocr_pdf_bytes`) to delete files from Mistral Files API using `client.files.delete(file_id=file_id)` in a `try...finally` block.

- [x] **7. General Code Quality, Deprecations, and Side Effects**
  - [x] Remove import-time global `sys.stdout` side effects from [rag_index.py](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/rag_index.py) and [db/push_to_supabase.py](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/db/push_to_supabase.py).
  - [x] Refactor circular dependency workarounds (e.g. moving shared HTTP configuration out of [scraper/cdep.py](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/scraper/cdep.py)).
  - [x] Replace deprecated `datetime.utcnow()` with time-zone aware standard equivalents.
  - [x] Simplify over-complicated expressions (e.g. the onboarding completion lambda in [personalization.py](file:///c:/Users/Matei/Desktop/civicmind/legislative-intelligence/personalization.py)).
