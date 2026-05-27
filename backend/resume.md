# Backend Technical Debt & Code Smells

This document outlines potential code smells, scalability limits, and safety issues identified in the backend codebase. These are non-blocking for an MVP but should be addressed before heavy production scaling.

## 1. Scalability & Performance
- **Missing Database Indexes (`db_index=True`):** 
  - Frequently filtered fields lack database indexes. For example: `Bill.status`, `Parliamentarian.county`, and `Parliamentarian.party`. As the dataset grows, `WHERE` clauses on these fields will trigger full table scans.
- **Pagination Strategy:**
  - `StandardPagination` uses `PageNumberPagination`. This performs a `SELECT COUNT(*)` on every request to calculate `totalPages`. For large tables (like `mp_votes` or millions of `bills`), this becomes a severe performance bottleneck. Consider switching to `CursorPagination` for infinite-scroll feeds like the personalized bill feed.
- **Dynamic Q-Object Building in Feed:**
  - `FeedService.get_personalized_bills` builds dynamic `Q()` objects in a loop based on user interests. If a user selects 50 interests, it generates a massive SQL `OR` chain. This should eventually be optimized, perhaps using Postgres Array overlap operators (`&&`) if restructured, or by relying on semantic search vectors for the feed.

## 2. Maintainability & "Magic" Values
- **Hardcoded Domain Data in Views:**
  - `ROMANIAN_COUNTIES` is hardcoded in `apps/parliamentarians/views.py`.
  - `DEFAULT_TRENDING_TOPICS` is hardcoded in `apps/bills/views.py`.
  - These should be moved to a centralized `constants.py` file, or better yet, managed via the database or environment variables so they can be updated without a code deployment.
- **Fat Serializer Logic:**
  - `ProfileQuestionnaireSerializer` dynamically queries the `Parliamentarian` table to get `party_options` inside a serializer method. While okay for small datasets, putting raw DB aggregation logic inside a serializer representation method can cause unexpected slowdowns during serialization loops.

## 3. Third-Party / Database Integration
- **Raw SQL for pgvector:** 
  - `SearchService.semantic_bill_search` uses a raw SQL cursor to call `match_legislation_chunks`. While necessary for custom Postgres functions, it breaks ORM portability. If the signature of the Postgres function changes, Django will not warn you during migrations.
