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

---

Further Refactoring Options

Remaining high-impact to focus on:

1. Authentication Flow Cleanup
The current authentication/views.py manually handles session cookies and token creation alongside dj-rest-auth. We can
standardize this to exclusively use standard DRF/allauth flows, reducing custom code and improving security.

2. Standardized Filtering
While BillViewSet uses a FilterSet, some other endpoints still perform manual filtering in get_queryset. We can
standardize all filtering using django-filter classes for better consistency.

3. Signal-based logic or Service hooks
Logic like "Create profile on user registration" or "Update ImpactScore when a vote is recorded" could be moved to
Django Signals or explicit Service hooks to keep the core models clean.


### 1. ViewSet & API Improvements
- [ ] **Auth Cleanup:** Standardize authentication views and remove manual token/session creation logic where `dj-rest-auth` or standard DRF can be used.

### 2. Testing & Validation
- [ ] **Integration Tests:** Rewrite `FeedTests` and `ParliamentarianVoteMapTests` to verify actual DB state rather than using heavy `MagicMock` on ORM methods.

## Long-term Goals
- Implement a more robust search engine integration (e.g., ElasticSearch or OpenSearch) if PG search proves insufficient for the scale.
