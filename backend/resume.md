# Backend Improvement Roadmap

✦ 🛠️ Refactoring Overview

  I have completed the following major improvements to the backend:

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
   4. Data Model Cleanup:
       * Normalization: Removed redundant mp_name and party fields from ImpactScore.
       * Managed Models: Switched models from managed = False to managed = True and generated/applied migrations,
         allowing Django to handle the schema and enabling proper integration testing.
   5. Stability & Optimization:
       * **Fixed:** Resolved a crash in BillViewSet.trending caused by a missing constant and broken fallback import.
       * **Optimized:** Improved prefetch efficiency for MPs using field limiting (only()) to reduce database payload
         size.

  ---

  🚀 Further Refactoring Options

  Here are the remaining high-impact areas we can focus on:

  1. Authentication Flow Cleanup
  The current authentication/views.py manually handles session cookies and token creation alongside dj-rest-auth. We can
  standardize this to exclusively use standard DRF/allauth flows, reducing custom code and improving security.

  2. Service Layer Expansion (Fat Models/Thin Views)
  We can move more business logic out of ViewSets into dedicated Services:
   * Feed Service: Handle the logic for "Recent Bills" and "Personalized Feed".
   * Vote Analytics Service: Handle the logic for grouping votes into buckets (For/Against/Abstain) and calculating
     session summaries.

  3. Standardized Filtering
  While BillViewSet uses a FilterSet, some other endpoints still perform manual filtering in get_queryset. We can
  standardize all filtering using django-filter classes for better consistency.

  4. Signal-based logic or Service hooks
  Logic like "Create profile on user registration" or "Update ImpactScore when a vote is recorded" could be moved to
  Django Signals or explicit Service hooks to keep the core models clean.


### 1. Serializer Refactoring
- [ ] **Convert to ModelSerializer:** Refactor `BillListSerializer`, `BillDetailSerializer`, and `VoteSessionSerializer` in `apps.bills` to use `ModelSerializer`.
- [ ] **Remove DB Queries:** Eliminate database queries from `ParliamentarianDetailSerializer` and `ParliamentarianVoteMapSerializer`. Move this logic into the viewset's `get_queryset` using `prefetch_related`.

### 2. ViewSet & API Improvements
- [ ] **Standard Pagination:** Replace manual pagination in `BillViewSet` and `ParliamentarianViewSet` with DRF's `PageNumberPagination`.
- [ ] **Global Search Refactor:** Break down the monolithic `GlobalSearchView` into a dedicated `SearchService` class. Separate entity extraction, Q-object building, and result ranking logic.
- [ ] **Auth Cleanup:** Standardize authentication views and remove manual token/session creation logic where `dj-rest-auth` or standard DRF can be used.

### 3. Data Model Cleanup
- [ ] **ImpactScore Normalization:** Remove redundant `mp_name` and `party` fields from `ImpactScore`. Update any logic depending on these to use the related `Parliamentarian` model.
- [ ] **managed = True Path:** Evaluate if unmanaged models can be moved to a managed state by creating proper migrations for the current DB schema.

### 4. Testing & Validation
- [ ] **Integration Tests:** Rewrite `FeedTests` and `ParliamentarianVoteMapTests` to verify actual DB state rather than using heavy `MagicMock` on ORM methods.
- [ ] **Unmanaged Model Support:** Configure a test DB setup that can successfully run migrations or schema creation for the currently unmanaged models.

## 🚀 Long-term Goals
- Implement a more robust search engine integration (e.g., ElasticSearch or OpenSearch) if PG search proves insufficient for the scale.
- Refactor `JSONField` usage in `AIAnalysis` and `VoteSession` into more structured relational models for improved reporting and analytics.
