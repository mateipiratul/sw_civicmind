# Backend Technical Debt & Code Smells

This document outlines potential code smells, scalability limits, and safety issues identified in the backend codebase. These are non-blocking for an MVP but should be addressed before heavy production scaling.

## 1. Third-Party / Database Integration
- **Raw SQL for pgvector:** 
  - `SearchService.semantic_bill_search` uses a raw SQL cursor to call `match_legislation_chunks`. While necessary for custom Postgres functions, it breaks ORM portability. If the signature of the Postgres function changes, Django will not warn you during migrations.
