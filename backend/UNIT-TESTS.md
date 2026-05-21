# Backend Unit Testing Guidelines

This document outlines the best practices and conventions for writing unit tests in the CivicMind backend (Django/DRF).

## 1. Database Interactions
- **Use Real Databases (No ORM Mocking):** Never use `unittest.mock.patch` or `MagicMock` on Django ORM methods (e.g., `Model.objects.all()`, `filter()`, `get()`).
  - *Why?* Mocking the ORM leads to brittle tests that pass even when the actual query is broken or unoptimized. It hides SQL errors, constraint violations, and relationship issues.
  - *How?* Use `rest_framework.test.APITestCase` or `django.test.TestCase`. These classes automatically wrap each test in a database transaction that is rolled back at the end, providing a clean state without affecting production data.
- **Consistent Test Database:** Ensure your local environment is configured to use a test database that mirrors production structures (PostgreSQL).

## 2. Test Structure
- **Use `setUp` / `setUpTestData`:** 
  - Use `setUp` for data that might be modified during the test.
  - Use `setUpTestData` (class method) for read-only data that can be shared across all test methods in the class, significantly speeding up execution.
- **Naming Conventions:**
  - Test classes should end with `Tests` (e.g., `FeedTests`, `BillSerializerTests`).
  - Test methods must start with `test_` and descriptively state what is being tested and the expected outcome (e.g., `test_personalized_feed_returns_only_matching_categories`).

## 3. Creating Test Data (Fixtures)
- **Model Bakery / Factory Boy (Recommended):** If test data setup becomes complex, use tools like `model_bakery` to generate instances with sensible defaults.
- **Manual Creation:** If manually creating data, explicitly define only the fields relevant to the test. Use helper methods if the same setup is repeated.
- **Avoid Global Fixtures:** Avoid using Django's JSON fixtures (`fixtures = ['data.json']`) as they become hard to maintain and couple tests together. Prefer explicit creation in `setUpTestData`.

## 4. What to Test
- **Serializers:** Test validation logic (`validate_<field>`, `validate`), creation, and field representation (especially `SerializerMethodField`s).
- **Services:** Test business logic in `services.py` extensively. These should be fast and test the core algorithms (e.g., feed ranking, search parsing).
- **Views/ViewSets:** Test HTTP methods, permissions, filtering, pagination, and response structure. Do not duplicate service logic tests here; focus on the HTTP contract.

## 5. Assertions
- Use appropriate DRF assertions:
  - `self.assertEqual(response.status_code, status.HTTP_200_OK)`
  - `self.assertIn('key', response.data)`
- Avoid blindly comparing large JSON blobs. Assert specific keys, counts, and structural integrity.

## 6. Refactoring Existing Tests
Many existing tests currently use `MagicMock` to bypass the database. As we refactor or touch these areas, these tests **must** be rewritten to use actual database state, following the guidelines above.