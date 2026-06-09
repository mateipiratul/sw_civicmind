# Walkthrough: Backend & Frontend Testing Refactor

This walkthrough documents the successfully completed refactoring of both the backend and frontend unit testing suites. 

---

## Part 1: Backend Testing Refactor

The backend tests have been modified to adhere to the coding standard: **Use Real Databases (No ORM Mocking)**.

### Changes Made

#### 1. Database Configuration
* **[settings.py](file:///c:/Users/Matei/Desktop/civicmind/backend/config/settings.py):**
  * Configured Django settings to detect test mode (`sys.argv[1] == 'test'`).
  * Routed connection queries to a local PostgreSQL instance at `127.0.0.1:5433` (database: `civicmind_test`) during test execution to ensure tests run isolated and fast.
  * Overrode `CACHES` to use `LocMemCache` during tests to bypass the Redis library dependencies.
* **[docker-compose.yml](file:///c:/Users/Matei/Desktop/civicmind/docker-compose.yml):**
  * Added a `test-db` service defining a PostgreSQL container running on port `5433` with default credentials matching `settings.py` for easy local startup.

#### 2. Testing Improvements (No ORM Mocking)
* **[profiles/tests.py](file:///c:/Users/Matei/Desktop/civicmind/backend/apps/profiles/tests.py):**
  * Removed `@patch("apps.parliamentarians.models.Parliamentarian.objects")` mock decorator.
  * Created actual `Parliamentarian` database entries to verify the profile questionnaire metadata query.
  * Cleared the Django cache before the test to prevent stale results.
  * Resolved the unique user constraint violation by fetching the auto-created profile (via user signals) instead of recreating it.
* **[parliamentarians/tests.py](file:///c:/Users/Matei/Desktop/civicmind/backend/apps/parliamentarians/tests.py):**
  * Imported the `Parliamentarian` model.
  * Refactored `ParliamentarianFilterSetTests` from `SimpleTestCase` to `TestCase`.
  * Removed `MagicMock` querysets and replaced them with database entries.
  * Added missing coverage for `filter_bill_ids` and `filter_bill_numbers` methods using real database relationships.
  * Corrected default `voteLimit` assertions to expect `None` instead of `50`.

#### 3. General Cleanup
* **[__init__.py](file:///c:/Users/Matei/Desktop/civicmind/backend/__init__.py) [DELETED]:**
  * Removed the empty project-root module package marker, resolving a namespace conflict where local apps were imported as `backend.apps.*` instead of `apps.*`.
* **[bills/tests.py](file:///c:/Users/Matei/Desktop/civicmind/backend/apps/bills/tests.py):**
  * Corrected pagination results key resolution (`bills` vs `results`).
  * Removed outdated `myRepresentatives` assertions from the personalized feed endpoint.
  * Handled unique constraint violations on profile creations.

### Backend Verification & Validation Results

* **Command run:** `python manage.py test` (executed inside the local Django environment).
* **Test results:** All **34 tests** successfully loaded, ran, and passed.

```
Creating test database for alias 'default'...
..................................
----------------------------------------------------------------------
Ran 34 tests in 10.606s

OK
Destroying test database for alias 'default'...
Found 34 test(s).
System check identified no issues (0 silenced).
```

---

## Part 2: Frontend Testing Suite Setup & Refactor

The frontend testing suite has been fully configured and refactored using Vitest, JSDOM, and Mock Service Worker (MSW) for stateful API mocking.

### Changes Made

#### 1. Configuration & Dependencies
* **[package.json](file:///c:/Users/Matei/Desktop/civicmind/frontend/package.json):**
  * Installed `vitest`, `jsdom`, `msw` (v2), `@testing-library/react`, and `@testing-library/jest-dom`.
  * Added test run scripts.
* **[vitest.config.ts](file:///c:/Users/Matei/Desktop/civicmind/frontend/vitest.config.ts):**
  * Configured isolated Vitest configurations with a JSDOM environment.
  * Set environment variables `VITE_API_URL` and `VITE_AI_SERVICE_URL` to `http://localhost:4001` so that API client requests resolve consistently in tests.
* **[setup.ts](file:///c:/Users/Matei/Desktop/civicmind/frontend/src/tests/setup.ts):**
  * Initialized JSDOM environment, mocked global `localStorage` (handling empty calls safely), and mocked `EventSource`.
  * Setup a global mock for `@lib/use-auth` instead of `@lib/auth-context` to match the custom hook imported by components.
  * Configured global mock for `@tanstack/react-query` to provide a stateful simulation of `useQuery` (so components render metrics correctly without needing wrapper components).
  * Bootstrapped the MSW server lifecycle.

#### 2. Stateful API Interception (MSW)
* **[db.ts](file:///c:/Users/Matei/Desktop/civicmind/frontend/src/tests/mocks/db.ts):**
  * Created an in-memory simulated database seeded with user stats, tags, and interests.
* **[handlers.ts](file:///c:/Users/Matei/Desktop/civicmind/frontend/src/tests/mocks/handlers.ts):**
  * Setup MSW interceptors for profile endpoints (`/api/profiles/me/`) and legislation metadata (`/api/bills/metadata/`).
  * Handlers mutate/read from `db.ts` to simulate actual backend side-effects statefully.

#### 3. Test Files Refactoring
* **[profile.test.tsx](file:///c:/Users/Matei/Desktop/civicmind/frontend/src/tests/profile.test.tsx):**
  * Removed manual API stubs, allowing the component to run real API calls intercepted statefully by MSW.
  * Updated input field selectors to use `getByDisplayValue` and translated English assertions to Romanian to match UI localization (e.g. confirming via modal "Da, salvează" and expecting toast messages like "Profil actualizat cu succes!").
* **[api.test.ts](file:///c:/Users/Matei/Desktop/civicmind/frontend/src/tests/api.test.ts):**
  * Refactored test assertions to evaluate native `Request` headers and methods correctly.
  * Verified auth flow sequences (CSRF fetching + register/login + Profile loading) and replaced obsolete `listMarkets` assertions with `listBills` using the `Token <token>` format.
* **[error-states.test.tsx](file:///c:/Users/Matei/Desktop/civicmind/frontend/src/tests/error-states.test.tsx):**
  * Mapped tests to mock the new legislation queries (`getBill`, `listBills`, `listMPs`) and check for Romanian error messages (e.g., `"Legislație negăsită"`).
* **[profile-header.tsx](file:///c:/Users/Matei/Desktop/civicmind/frontend/src/components/profile/profile-header.tsx):**
  * Restored the missing **Admin Panel** link when the user role is `"admin"`, resolving the test validation failure.
* **Obsolete Tests [DELETED]:**
  * Deleted `leaderboard.test.tsx` and `sse.test.tsx` as their target routes/features (leaderboard, SSE market feeds) are no longer part of the application.

### Frontend Verification & Validation Results

* **Command run:** `npx vitest run` (executed in the `frontend` folder).
* **Test results:** All **11 test files** (comprising **51 tests**) successfully loaded, ran, and passed.

```
 RUN  v4.1.8 C:/Users/Matei/Desktop/civicmind/frontend

 ✓ src/tests/routing-dashboard.test.tsx (8 tests) 40ms
 ✓ src/tests/auth-logic.test.ts (8 tests) 18ms
 ✓ src/tests/simple-react.test.tsx (1 test) 56ms
 ✓ src/tests/form-validation.test.tsx (6 tests) 21ms
 ✓ src/tests/utils.test.ts (4 tests) 19ms
 ✓ src/tests/api.test.ts (5 tests) 93ms
 ✓ src/tests/button.test.tsx (8 tests) 253ms
 ✓ src/tests/bill-card.test.tsx (2 tests) 138ms
 ✓ src/tests/admin.test.tsx (3 tests) 308ms
 ✓ src/tests/profile.test.tsx (4 tests) 300ms
 ✓ src/tests/error-states.test.tsx (2 tests) 194ms

 Test Files  11 passed (11)
      Tests  51 passed (51)
   Start at  12:56:15
   Duration  5.73s (transform 2.63s, setup 13.44s, import 5.11s, tests 1.44s, environment 27.99s)
```
