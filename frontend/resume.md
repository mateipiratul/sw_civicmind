# Frontend Code Smell Analysis Report

## 1. Type Safety & Explicit `any`
Extensive use of `any` bypasses TypeScript's safety and makes the codebase fragile during backend contract changes.

*   **`src/lib/api.ts`**:
    *   `let data: any`: In the `requestTo` helper, response data is typed as `any`.
    *   Error handling: Validation errors from Django are mapped using `(e: any)`, losing type safety for error fields.
    *   `confirmPasswordReset`: Payload is typed as `any`.
*   **`src/components/ui/combobox.tsx`**:
    *   `className as any`: Multiple components use `any` casting for class name merging, which can be avoided by proper typing or `string | undefined`.
*   **`src/components/ui/alert-dialog.tsx`** & **`dropdown-menu.tsx`**:
    *   Uses `any` in some internal Radix mappings or props passing (inherited from some utility patterns).

## 2. Cascading Renders (`react-hooks/set-state-in-effect`)
While much of the codebase has been moved to `useQuery`, some state-syncing effects still exist.

*   **`src/lib/auth-context.tsx`**:
    *   `useEffect` calls `setUser` after background refresh. This is technically a cascading render, though common for session restoration.
    *   `useEffect` must NOT be acknowledged with `// eslint-disable-next-line react-hooks/exhaustive-deps`, issue should be handled accordingly.

## 3. Fast Refresh Compatibility
Most issues were resolved by extracting variants and hooks, but some remain.

*   **`src/lib/auth-context.tsx`**:
    *   Exports both `AuthProvider` (component) and `AuthContext`/`AuthContextType`. Moving the context to a separate core file is recommended (if not already fully isolated).
*   **`src/components/ui/combobox.tsx`**:
    *   Exports multiple components and logic.

## 4. Performance & Memoization
*   **`src/components/search/search-results-shell.tsx`**:
    *   Large computations for `filteredLaws` and `filteredMps` are performed on every render. While `useMemo` is used, the dependency arrays are large and could benefit from stabilization.
*   **`src/components/feed/dashboard-page.tsx`**:
    *   `localMPsQuery` enabled based on `user?.county`. If `user` changes frequently, this could trigger unnecessary refetches.

## 5. Summary of Progress
The following major code smells have been **successfully eliminated**:
*   **Monolithic Routes**: `index.tsx`, `search.tsx`, and `mps/index.tsx` are now clean entry points.
*   **Manual Data Fetching**: Replaced `useEffect` + `fetch` with TanStack Query in all admin and main feed views.
*   **Syncing Props to State**: Refactored the Profile page to initialize form state directly from props in a sub-component.

---

## 🛠️ Refactoring Plan: API Client Modularization (`src/lib/api/`)

The current `api.ts` is a 550+ line monolith containing types, configuration, and all domain logic. We will split it into a scalable structure:

### Phase 1: Core & Types
- [ ] **`api/config.ts`**: Extract base URLs and environment configuration.
- [ ] **`api/base.ts`**: Extract `ApiError` and the core `ApiClient` base class with `requestTo`, CSRF, and Auth logic.
- [ ] **`api/types/`**: Split the 20+ interfaces into domain-specific files:
    - `bills.ts`, `mps.ts`, `auth.ts`, `rag.ts`, `common.ts`.

### Phase 2: Domain Modules
- [ ] **`api/modules/auth.ts`**: Auth-related methods (Login, Register, Google Auth).
- [ ] **`api/modules/bills.ts`**: Bill listing, detail, votes, and feed logic.
- [ ] **`api/modules/mps.ts`**: MP directory, detail, and representative logic.
- [ ] **`api/modules/ai.ts`**: RAG chat and onboarding analysis.
- [ ] **`api/modules/admin.ts`**: Statistics and administrative management.

### Phase 3: Integration
- [ ] **`api/index.ts`**: Re-export a unified `api` singleton that composes these modules, ensuring zero breaking changes for the rest of the app.
- [ ] **Type Tightening**: Replace remaining `any` usage in `requestTo` and error handlers with proper generics and exhaustive error types.
