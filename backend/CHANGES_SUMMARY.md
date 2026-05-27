# Backend Architecture & Systems Summary

This document summarizes the core systems and architectural patterns currently active in the CivicMind backend.

## 1. Search Infrastructure (Hybrid Engine)
- **Engine**: 100% PostgreSQL-based, utilizing `pgvector` for semantic search.
- **Semantic Matching**: Uses Mistral AI Embeddings (`mistral-embed`) cached in Redis. Matches are processed using a custom PostgreSQL function (`match_legislation_chunks`).
- **Entity Extraction**: MPs, parties, and counties are extracted from queries using an aggressively cached entity map, allowing hybrid (keyword + semantic) search without external tools like Elasticsearch.

## 2. Database & Data Models
- **Relational AI Data**: AI analysis data (Impact Categories, Affected Profiles, Key Ideas, Arguments) is stored in fully relational tables (`ImpactCategory`, `AffectedProfile`, `KeyIdea`, `BillArgument`). This replaces the legacy JSON-blob approach, allowing for complex ORM filtering and explicit Foreign Key relationships.
- **Prefetching**: Viewsets enforce heavy use of `select_related` and `prefetch_related` in service classes (`BillService`, `FeedService`) to completely eliminate N+1 queries during serialization.

## 5. Distributed Caching & Architectural Cleanup
- **Implementation**: Uses Redis (via `django-redis` protocol or `upstash-redis` REST client) integrated natively into Django's `CACHES` settings.
- **Usage**: 
  - Semantic query embeddings (1-hour TTL).
  - Parliamentarian metadata & entity lists (24-hour TTL) to prevent redundant `DISTINCT` aggregations.
  - MD5 hashing is used for cache key generation to ensure multi-process consistency.
- **Cache Reliability**: Implemented Django signals to automatically invalidate parliamentarian-related caches when data changes, eliminating the risk of stale data in search results or filters.

## 8. Maintainability & Code Quality
- **Centralized Constants**: Created `apps/core/constants.py` to house domain-specific data (e.g., Romanian counties, trending topics), removing "magic" hardcoded values from views.
- **Service Layer Abstraction**: Introduced `ParliamentarianService` to handle complex logic like party option extraction, keeping serializers lean and focused on representation.
- **Aggressive Metadata Caching**: Form options for the user questionnaire are now cached for 24 hours, drastically reducing database load for frequently accessed form metadata.


## 4. Automation & Personalization
- **Signals**: Profile creation is automated via standard Django `post_save` signals on the User model.
- **Impact Scoring**: MP impact scores and vote aggregations are updated dynamically via `post_save`/`post_delete` signals on the `MPVote` model, keeping core models lean.
- **Feed Logic**: The personalized bill feed filters legislation based on matching `ImpactCategories` and `AffectedProfiles` using highly optimized `Exists()` subqueries to avoid expensive `JOIN` and `.distinct()` performance penalties.
