# Direction sheet — workshop 1

> **Software Engineering 2026–27** · optional, not graded.
> Workshop 1 (W5, 26–30 Oct) confirms the direction you are taking your project in. Teams that bring this sheet get a shorter, sharper discussion.
>
> **How:** copy this file to the root of your repository as `DIRECTIE.md`, fill it in and commit it before your workshop slot. Bring it to the workshop in your repository.
> **Workshop:** we will post a calendar; each team books its own slot in the 4-hour window, with Rareș and Petru.
> **Length:** at most two pages. Short bullet points, not essays.
> **When:** sections 1–6 after lecture 2 (W3); sections 7–8 after lecture 3 (W4).
> **AI:** allowed and declared (in the commit message), as for any deliverable. At the workshop, every member must be able to explain every line.
>
> The guidance is in `<!-- ... -->` comments: they don't show on GitHub, keep or delete them.

| | |
|---|---|
| **Team** | Grup 15 |
| **Members** | Cocu Matei-Iulian, Ene Andrei Tudor, Folea Alexandru, Mitrache Antonie-Daniel, Smădu Andrei |
| **Repository** | https://github.com/inginerie-software-26-27/is2627-proiect-group-15 |

---

## 1. The system as it is (as-is)

<!-- What it does, in 3 sentences. Who it is for.
     Its real state: what works, what is half done, what doesn't work at all.
     How you found out: what you read and what you ran (README, issues, tests, code). -->

CivicMind is an application developed to combat misinformation and simplify how citizens track political activity. It gathers fragmented legislative data from trusted sources, transforms it into clear insights, and helps citizens easily answer the question that really matters: *"Are these politicians truly representing my interests?"*. 

Currently, the scraper only works for cdep.ro and it transfers the data to the database with minimal data processing, this should be improved as it is not yet production ready. The system that determines the "trust-score" is currently a simple linear function, so it doesn't really mean too much for the user. The frontend works well on desktop, but lacks responsiveness for mobile users. The database is currently not working, since our subscription to the cloud provider has expired.

---

## 2. Direction (to-be)

<!-- At most three goals for this semester: what you will harden, fix, change.
     For each one: why now, and how you will know you reached it. -->

| # | Goal | Why now | How we'll know we reached it |
|---|---|---|---|
| G1 | Dynamic scraping over multiple sources (not only cdep.ro) | Our initial goal was to write a simple scraper, it is only natural that for an application that heavily relies on raw data to have access to more. | The collected data will be available for the user's endpoint cleanly, safely and readably. |
| G2 | Generic AI features | Somehow compute the "trust-score" of politicians using some sort of model, improve chatbot usability |  |
| G3 | Frontend responsiveness | The initial frontend was rather an MVP, something that didn't put too much accent on UX, but rather the information itself, so the next step is to improve overall UX and make the UI mobile-user-friendly | When the application will be easily navigated within a mobile environment. |

**What we will not do:**

- 

## 3. Stakeholders

<!-- Not only the users (your MDS personas): anyone affected by the system. -->

| Who | What they want from the system | How we find out (interview, observation, scenario, repository) |
|---|---|---|
| **Engaged citizens / voters** | A feed of bills relevant to their county and interests, 3-idea summaries they can read in under a minute, and push alerts only when a relevant bill is actually up for a vote |**observation** of usability sessions on onboarding and the law profile; **scenario** walkthroughs of the user stories |
| **Citizens without legal background** (older voters, low digital literacy) | Plain language, no jargon, a visible link to the original source so they can trust the summary, and a simple UI | **Observation** (think-aloud tests on the summary + Pro/Con screen); **interviews** with family members or acquaintances outside IT |
| **Deputies and senators** (affected, not users) | An accurate, contextualized picture of their votes: absence vs. abstention, amendment vs. final vote, party discipline. A clear methodology for the Impact Score and a way to contest it | **Repository:** vote records on cdep.ro / senat.ro; **scenario:** "an MP disputes their score" |
| **Legal experts / fact-checkers** | AI summaries faithful to the explanatory memorandum and final text, with no hallucinated articles or effects; Pro/Con arguments sourced from official opinions (Legislative Council, ESC) | comparing explanatory memorandum PDFs against agent output (agent evals); **interview** with a law student or lawyer to validate a sample of summaries |
| **Regulators: EU AI Act / AEP** | Disclosure that summaries are AI-generated (AI Act, art. 50: text informing the public on matters of public interest); neutrality during election campaigns | **Repository:** AI Act text, electoral legislation (Law 208/2015), AEP decisions; **scenario:** the app runs during an election campaign |


## 4. Our resources

<!-- Realistic, not optimistic. A technology nobody on the team knows automatically gets risk 9 (section 6). -->

| Resource | What we have, realistically | What we are missing |
|---|---|---|
| **People** <br><sub>members, hours per week each, who is away and when</sub> | 5 members, 2 hours/wk for each member | Nothing |
| **Knowledge** <br><sub>what we master, what would be a first</sub> | This entire development process will imply mastering generic full-stack software development skills, such as building a reliable backend, improving UI with multiple ideas in consideration (specific users, various devices), as well as understanding how more robust scrapers are built and the continuous pipeline of integration and development. | Currently, knowledge of how we should effectively scrape the data we need better. |
| **Technical** <br><sub>stack, environments, CI, hosting, external services</sub> |**Frontend:** React + Vite + TypeScript SPA, **Backend:** Django 6.0 + Django REST Framework, **AI Service (FastAPI):** FastAPI + LangGraph, **Database:** Supabase PostgreSQL, **CI**: GitHub Actions, currently using Supabase (for database), Upstash for Redis, Mistrall API calls within free tier | Supabase and Upstash connections were shut down, we will either continue with the already chosen free tiers or start fresh with something else |
| **Financial** <br><sub>budget (say so if it is zero)</sub> | Minimal, some members do not have paid subscriptions for agentic AI services, and, moreover, the infrastructure will be built around free tiers of various services | Money; either if it is for internal development use or agents within the app's architecture |
| **Access to AI** <br><sub>models, plans, who has them, limits; what data may not go into a model</sub> | Gemini 4 (Student Plan), Claude Code with Opus 5.5 (20$ plan); private API keys | State of the art agentic AI |

## 5. Feasibility

<!-- After Sommerville, Software Engineering, 10th ed., p. 104, adapted.
     A "no" or "we don't know" is a good topic for the workshop. -->

| Question | Yes / No / Don't know | Why |
|---|---|---|
| Does the direction serve what the stakeholders in section 3 want? | Yes | The app will undergo UI changes, so that the app may be used with ease by any citizen; any AI generated output will be improved with future updates and will be (*somewhat*) anchored to a single source of truth. |
| Can it be done by the end of the semester, with the resources in section 4? | Yes, with reduced scope | The core already works: cdep.ro scraping, the Scout agent with PDF processing, onboarding, and CI. |
| Does it integrate with what already exists in and around the system? | Yes | Technically, the codebase was refactored so that it can withstand further implementations, so this should be fine. Regarding what the application brings to the table, it already covers most of the initially proposed features. |

## 6. Top five risks

<!-- Type: estimation / organizational / people / requirements / technology / tools.
     Impact and likelihood from 1 to 3; score = impact × likelihood (1–2 low, 3–4 medium, 6–9 high).
     Strategy: avoid / minimize / contingency. -->

| # | Risk | Type | Impact | Likel. | Score | Strategy |
|---|---|---|---|---|---|---|
| R1 | The cdep.ro scraper breaks: the HTML structure changes, the site goes down, or we get blocked | Technology | 3 | 2 | 6 (high) | **Minimize:** parser tests on saved HTML snapshots in CI, a daily health check that alerts on 0 results, request throttling. **Contingency:** serve the last valid data with a "last updated" banner. |
| R2 | The Scout agent hallucinates in summaries or Pro/Con arguments on a sensitive law | Technology | 3 | 2 | 6 (high) | **Minimize:** agent evals on a golden set of memoranda checked by hand, every claim linked to the source PDF. **Contingency:** the admin can withdraw a summary before it reaches the feed. |
| R3 | Non-compliance with GDPR: political interests are special-category data (art. 9) | Requirements | 3 | 1 | 3 (medium) | **Avoid:** separate explicit consent (art. 9(2)(a)) for interests and messages to MPs, collect only county and interests, account deletion (art. 17). |
| R4 | The Impact Score is perceived as biased (absences counted as opposition, procedural votes included) | Requirements | 2 | 2 | 4 (medium) | **Minimize:** a public methodology, a per-vote breakdown with sources, absences shown separately, procedural votes excluded. |
| R5 | We underestimate the effort for the Senate scraper and the electoral promises source | Estimation | 1 | 2 | 2 (low) | **Avoid:** cdep.ro only, and an Impact Score based on votes alone this semester; the rest moves to the icebox. |

## 7. Candidate requirements (after W4)

<!-- Between 5 and 10. Requirements live in the repository, next to the code and the tests that check them (lecture 3).
     Priority: must / should / could / won't (won't = not this time).
     Type: functional (F) or non-functional: product / organizational / external (Sommerville, Fig. 4.3).
     Source: the stakeholder, issue, code or test it comes from, and who confirmed it (a requirement mined from code is not confirmed by the code).
     Why: the rationale, so you know whom to ask when it changes.
     How we check it: a test, or a measure with a threshold. "It should be fast" is not a requirement; "the seat map loads in under 2 s for 95% of requests" is. -->

| # | Requirement | Priority | Type | Source · confirmed by | Why (rationale) | How we check it |
|---|---|---|---|---|---|---|
| C1 | The system shall show citizens the newest legislative projects, ordered from newest to oldest, with an additional filter for personal preferences for each user. | must | F | User Stories, “stay updated” | Citizens should not have to search multiple government websites to find current projects. | Feed integration test with dated fixtures verifies descending date order and inclusion of the newest project. |
| C2 | For each supported legislative project, the system shall provide a plain-language summary containing exactly three key ideas, Pro and Con arguments, and links to the official source data used. | must | F | User Stories, “without a legal background” and “objective voter” | Citizens need accessible explanations and evidence to form their own opinions. | Analysis output test verifies three key ideas, both argument categories, and valid official-source references. |
| C3 | The system shall show each parliamentarian’s recorded votes on finalized laws and an Impact Score derived from the available voting record. | must | F | User Stories, “voter demanding transparency” and “tracking politician consistency” | Citizens need evidence of representatives’ actions to assess accountability. | Vote/score integration test verifies displayed votes match fixture records and the score matches the documented calculation for those records. |
| C4 | The system shall let a signed-in citizen save a county and interest categories, then use those preferences to tailor the feed and voting alerts. | should | F | User Stories, “new user” and “busy professional” | Relevant information helps citizens follow issues that affect them without excessive alerts. | Profile/feed/alert tests verify saved preferences affect matching results and non-matching projects do not trigger alerts. |
| C5 | The system shall generate an editable email draft addressed to the citizen’s selected representative, using a supplied civic-engagement template. | should | F | User Stories, “engaged constituent” | A usable starting point can lower the effort needed to contact elected representatives. | Messenger test verifies the draft contains the selected representative’s address and generated body, and can be edited before sending. |


## 8. Top three architecture characteristics (if you get this far)

<!-- Only three: the ones the system can't succeed without (Richards & Ford, ch. 4–5; remember the Vasa).
     Each with the requirement (C1…) or domain concern it comes from. Implicit ones count: nobody writes them down, but you know them from the domain
     (for example, everyone registers in the last 10 minutes). -->

| # | Architecture characteristic | Comes from which requirement or domain concern | Explicit / implicit |
|---|---|---|---|
| A1 | **Auditability**: every summary, Pro/Con argument and Impact Score can be traced back to the raw source document and the vote it came from | The "no black boxes" explainability requirement and the user story about seeing where the raw data came from; the product's whole reason to exist is fighting misinformation, so an untraceable claim makes it worse than useless | Explicit |
| A2 | **Fault tolerance of the ingestion pipeline**: a scraper failure must not corrupt or wipe existing data, and the rest of the system keeps serving the last valid state | Domain concern: the sources (cdep.ro, Senate) are outdated sites we don't control and that change without notice (risk R1). The feed and the Impact Score depend entirely on them | Implicit |
| A3 | **Testability**: agent behaviour (summaries, classification) can be checked automatically against reference outputs before every change is merged | The administrator user story about automated checks catching broken builds, regressions and unsafe agent changes; in this domain a prompt or model change can silently start producing wrong legal claims, and only an eval suite catches that | Explicit |
 
## 9. Questions for the workshop

<!-- What you couldn't decide on your own. -->

- 
