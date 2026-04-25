🤖 GEMINI.md: Frontend Architect Context (React + Vite)

  🎯 Frontend Vision
  The CivicMind frontend must transform dense legislative data into a "Pinterest-style" personalized feed. It should feel modern, fast, and highly visual, focusing on
  Impact Badges and Accountability Metrics (Impact Scores).

  🛠️ Tech Stack
   * Framework: React (TypeScript)
   * Build Tool: Vite
   * Styling: Vanilla CSS (Modular preferred); use TailWind for more complex visuals, where needed, but moderately
   * Icons: Lucide React
   * Data Fetching: TanStack Query (React Query) or Axios
   * State Management: React Context (for Auth/User Profile)

  🚀 Frontend Backlog & Tasks

  1. 🛡️ Authentication & Onboarding
   - [ ] Login/Register Screens: Integration with Django POST /auth/login and POST /auth/register.
   - [ ] Personalization Wizard: 
       - County selection (Dropdown).
       - Interest selection (IT, Education, Freelance, etc.) stored as an array.
       - Sync with PUT /api/profiles/me/.

  2. 📰 The Civic Feed (Personalized)
   - [ ] Main Feed: Fetch from GET /api/bills/personalized/.
   - [ ] Bill Cards: 
       - Visual "Impact Badges" based on categories.
       - AI-generated "Title Short" and 3-sentence summary.
       - Status indicator (e.g., "La Senat", "Adoptată").

  3. 📄 Bill Detail View
   - [ ] Synthesis Section: Display 3 Key Ideas + Pro/Con Argument cards.
   - [ ] Voting Results: Component to show "For/Against/Abstain" breakdown.
   - [ ] MP List: Filterable list of how representatives voted on this specific bill.
   - [ ] Messenger Action: "Generate Email" button that opens a modal with an AI-drafted template.

  4. 📈 Parliamentarian (MP) Profiles
   - [ ] Scoreboard: Visual gauge for the Impact Score.
   - [ ] Consistency Feed: List of their votes vs. user interests.
   - [ ] Contact Card: Display enriched email and county data.

  ⚙️ Vite Configuration Rundown

  To ensure seamless development with the Django backend, configure vite.config.ts as follows:

  1. API Proxying
  Avoid CORS issues during local development by proxying requests to the Django server.

   1 // vite.config.ts
   2 export default defineConfig({
   3   server: {
   4     proxy: {
   5       '/api': 'http://localhost:8000',
   6       '/auth': 'http://localhost:8000',
   7     }
   8   }
   9 })

  2. Path Aliases
  Clean up imports for a scalable architecture.

   1 resolve: {
   2   alias: {
   3     '@': path.resolve(__dirname, './src'),
   4     '@components': path.resolve(__dirname, './src/components'),
   5     '@hooks': path.resolve(__dirname, './src/hooks'),
   6   },
   7 }

  3. Environment Variables
  Use .env for the FastAPI AI Service URL if calling directly for RAG chat:
   * VITE_API_BASE_URL: Base URL for Django.
   * VITE_AI_SERVICE_URL: Base URL for FastAPI agents.

  ⚠️ Implementation Rules
   1. Null Safety: AI analysis and Impact Scores may be null. Show "Processing..." or "Data Pending" states instead of crashing.
   2. Skeleton Screens: Use loading skeletons for the feed to maintain high perceived performance.
   3. Aesthetics: Use a professional "Gov-Tech" palette: Deep blues, clean whites, and high-contrast status colors (Green for adopted, Amber for in-progress).
