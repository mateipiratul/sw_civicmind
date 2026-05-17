# Frontend Refactoring & Code Quality Guidelines

## 1. Strict UI Preservation (Zero Visual Changes)
The primary directive for all frontend refactoring is that the UI must remain **completely intact and visually identical** to the user.
- **Visual Parity is Mandatory:** Any structural changes to the component tree must leave the user interface unchanged.
- **Styling Source of Truth:** Rely on the existing `src/styles.css` and the current inline styles or utility classes. 
- **No Rogue Redesigns:** Do not transition components entirely to new utility classes (like Tailwind) if it risks losing the original hex colors, specific padding, margins, flex layouts, or border radii. Preserve the "meaning" and aesthetic of the current design.

## 2. Handling Code Smells & React Anti-Patterns
Based on the current architecture and static analysis, the following code smells must be systematically eliminated during refactoring:

### A. Cascading Renders (`react-hooks/set-state-in-effect`)
- **The Smell:** Calling state setters (`setState`) synchronously inside `useEffect`. This triggers double-renders, hurts performance, and makes state difficult to follow.
- **The Fix:**
  - Derive state during the render cycle whenever possible (e.g., instead of sinking a prop into state via an effect, just use the prop directly).
  - Use event handlers to update state rather than syncing state changes reactively via `useEffect`.
  - Pass initial state correctly (e.g., from router parameters) directly into `useState` rather than setting it in an effect mount.

### B. Fast Refresh Compatibility (`react-refresh/only-export-components`)
- **The Smell:** Exporting non-component items (like constants, utility functions, or mock data) from files that contain React components (especially TanStack route files). This breaks Vite's Fast Refresh.
- **The Fix:** 
  - Move constants, helper functions, and types into separate utility files (e.g., `src/components/feed/constants.ts` or `src/lib/types.ts`).
  - Ensure files containing React components *only* export React components (and the TanStack `Route` object for route files).

### C. Type Safety & Unused Code
- **The Smell:** Extensive use of `any` (`@typescript-eslint/no-explicit-any`) and unused variables/imports (`@typescript-eslint/no-unused-vars`).
- **The Fix:**
  - Replace `any` with precise TypeScript interfaces matching backend models or `unknown` where dynamic.
  - Clean up and remove dead code, unused imports, and unreferenced components to keep files lean.

### D. Memoization & Compiler Optimization
- **The Smell:** Incorrect dependency arrays in `useCallback` or `useMemo`, or aliasing `this`. This can cause stale closures or break React Compiler optimizations.
- **The Fix:** Adhere strictly to exhaustive dependency arrays, and ensure hooks like `useMemo` are utilized effectively for computationally expensive data shaping (e.g., filtering large lists of MPs or Bills).

## 3. Structural De-Monolithization
- Break down massive "god" components (e.g., complex route files like `index.tsx`, `search.tsx`, and `mps/index.tsx`) into highly focused, single-responsibility components within dedicated feature folders (e.g., `src/components/[feature]/`).
- Keep routing logic, data fetching (`useQuery`), and global state access isolated from purely presentational UI components.
