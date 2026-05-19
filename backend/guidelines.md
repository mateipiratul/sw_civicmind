# Backend Coding Guidelines

## 1. Django Models & Architecture
- **Standard Primary Keys:** Prefer the default `id` (AutoAutoIncrement) unless there is a strong reason to use external identifiers as primary keys.
- **Managed Models:** Whenever possible, let Django manage the schema (`managed = True`). For external data, consider using a staging/ingestion layer rather than pointing unmanaged models directly at external tables in core logic.
- **Avoid Redundancy:** Do not duplicate data across related models (e.g., `mp_name` and `party` in `ImpactScore` are already in `Parliamentarian`). Use relationships to access this data.
- **Relational Integrity:** Use `JSONField` sparingly. If data has a fixed structure or needs indexing/complex filtering, prefer relational tables.

## 2. DRF Serializers
- **Use `ModelSerializer`:** Always prefer `serializers.ModelSerializer` over `serializers.Serializer` for models. It reduces boilerplate and ensures consistency with model definitions.
- **No DB Queries in Serializers:** Never perform database queries inside `SerializerMethodField`, `validate`, or `to_representation`. This causes N+1 issues.
- **Query Optimization:** Data required by serializers should be fetched in the ViewSet using `select_related` or `prefetch_related`.

## 3. Views & ViewSets
- **Built-in Pagination:** Use DRF's pagination classes (e.g., `PageNumberPagination`) instead of manual slicing and response building.
- **Thin Views:** Keep views and viewsets thin. Move complex business logic, third-party integrations, or heavy computations into dedicated **Service** classes (e.g., `apps/search/services.py`).
- **DRY Filtering:** Use `DjangoFilterBackend` and `FilterSet` classes for consistent filtering across endpoints.

## 4. Authentication & Permissions
- **Explicit Permissions:** Always define `permission_classes` on every view/viewset.
- **Standard Flows:** Rely on standard DRF authentication schemes (Token, Session, JWT) rather than manual session/token bridging unless strictly necessary for multi-client support.

## 5. Testing
- **Realistic Tests:** Use `APITestCase`. Avoid mocking the Django ORM; test actual database state and responses.
- **Test Management:** For unmanaged models, ensure the test runner is configured to create the necessary tables in the test database, or temporarily enable management during the test run.
- **Coverage:** Aim for high coverage on serializers (validation logic) and services (business logic).
