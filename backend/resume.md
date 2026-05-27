# Backend Technical Debt & Code Smells

This document outlines potential code smells, scalability limits, and safety issues identified in the backend codebase. These are non-blocking for an MVP but should be addressed before heavy production scaling.

## 1. Maintainability & "Magic" Values
- **Hardcoded Domain Data in Views:**
  - `ROMANIAN_COUNTIES` is hardcoded in `apps/parliamentarians/views.py`.
  - `DEFAULT_TRENDING_TOPICS` is hardcoded in `apps/bills/views.py`.
  - These should be moved to a centralized `constants.py` file, or better yet, managed via the database or environment variables so they can be updated without a code deployment.
- **Fat Serializer Logic:**
  - `ProfileQuestionnaireSerializer` dynamically queries the `Parliamentarian` table to get `party_options` inside a serializer method. While okay for small datasets, putting raw DB aggregation logic inside a serializer representation method can cause unexpected slowdowns during serialization loops.

## 2. Third-Party / Database Integration
- **Raw SQL for pgvector:** 
  - `SearchService.semantic_bill_search` uses a raw SQL cursor to call `match_legislation_chunks`. While necessary for custom Postgres functions, it breaks ORM portability. If the signature of the Postgres function changes, Django will not warn you during migrations.
