# Backend Improvement Roadmap

Finished & Fixed:
  1. Serializer Refactoring:
      * Converted all core serializers (Bill, VoteSession, Parliamentarian, Profile, User) to ModelSerializer.
      * Eliminated N+1 logic: Removed inline database queries from ParliamentarianDetailSerializer and others. Data is
        now efficiently fetched via ViewSet prefetching.
  2. Pagination Standardization:
      * Created a core app with StandardPagination classes.
      * Replaced manual slicing/response logic in BillViewSet and ParliamentarianViewSet with DRF's
        PageNumberPagination.
  3. Search Logic Extraction:
      * Created backend/apps/bills/services.py and extracted the 250+ line GlobalSearchView logic into a clean
        SearchService.
      * Simplified the view to focus only on request/response handling.
      * **Fixed:** Improved search logic to handle entity-only queries (e.g., searching for "PSD" now returns all MPs
        regardless of bill matches).
  4. Relational Data Model Overhaul:
      * **JSONField Refactor:** Successfully refactored unstructured `JSONField` usage in `AIAnalysis` and `VoteSession` 
        into proper relational models (`ImpactCategory`, `AffectedProfile`, `KeyIdea`, `BillArgument`, and `PartyVoteResult`).
      * **Data Migration:** Performed a robust data migration to move all existing JSON data into the new tables.
      * **Schema Cleanup:** Removed legacy JSON fields from the database to ensure data integrity and structural 
        cleanliness.
  5. Service Layer Expansion (Fat Models/Thin Views):
      * **Feed Service:** Extracted personalized feed and representative MP fetching logic into a dedicated `FeedService`.
      * **Vote Analytics Service:** Extracted vote bucket categorization and session summary logic into a dedicated 
        `VoteAnalyticsService`.
      * **Code Cleanliness:** Reduced `BillViewSet` complexity significantly, improving maintainability and testability.
  6. Stability & Optimization:
      * **Fixed:** Resolved a crash in BillViewSet.trending caused by a missing constant and broken fallback import.
      * **Optimized:** Improved prefetch efficiency for MPs using field limiting (only()) to reduce database payload
        size.
  7. Authentication Flow Cleanup:
      * Standardized authentication flow to use standard DRF/allauth via dj-rest-auth.
      * Removed manual session cookie and token creation.
      * Migrated Profile creation on user registration to use Django Signals.
  8. Standardized Filtering:
      * Standardized all filtering in viewsets using `django-filter` classes.
      * Removed manual `.filter()` calls from `ParliamentarianViewSet.my_representatives` in favor of injecting data into `ParliamentarianFilterSet`.
      * Extended `ParliamentarianFilterSet` to natively handle `bill_ids` and `bill_numbers` filtering.
  9. Signal-based logic & Service hooks:
      * Created `apps/parliamentarians/signals.py`.
      * Extracted `ImpactScore` aggregation logic into a `post_save` and `post_delete` signal on the `MPVote` model. This keeps the core models clean and automates stat tracking.
  10. Bug Fixes & Refinement (Relational Transition):
      * **Fixed:** Resolved 500 Internal Server Error in `ParliamentarianViewSet` caused by attempting to use `.only()` and `source` on a ManyToMany field (`impact_categories`) that was refactored to `rel_impact_categories`.
      * **Updated:** Refactored `MPVoteSerializer` to use `SerializerMethodField` for `impact_categories`, ensuring safe traversal of the AI Analysis relationship.
      * **Refined:** Updated `BillFilterSet` to natively query the new `rel_impact_categories` model, maintaining full filtering functionality after the JSONField removal.
      * **Validation:** Updated `FeedTests` and `BillFilterSetTests` to reflect the new relational structures.

---

Further Refactoring Options

Remaining high-impact to focus on:

### 0. URGENT: Frontend Alignment
- [x] **API Client Refactor:** The `frontend/src/lib/api.ts` is currently out of sync with the backend refactors (relational models, standardized pagination, and auth flows). Need to update interfaces and client methods to match the new DRF outputs. (Refactored to support relational AI analysis, party vote results, and unified pagination).

### 1. ViewSet & API Improvements
- [x] **Auth Cleanup:** Standardize authentication views and remove manual token/session creation logic where `dj-rest-auth` or standard DRF can be used.
- [x] **Standardized Filtering:** Use `django-filter` classes consistently instead of manual filtering in `get_queryset`.

### 2. Testing & Validation
- [ ] **Integration Tests:** Rewrite `FeedTests` and `ParliamentarianVoteMapTests` to verify actual DB state rather than using heavy `MagicMock` on ORM methods.

## Long-term Goals
- Implement a more robust search engine integration (e.g., ElasticSearch or OpenSearch) if PG search proves insufficient for the scale.
