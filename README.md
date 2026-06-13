# 🏛️ CivicMind

**Transforming political transparency from theory into practice through AI and Civic Tech.**

CivicMind is an application developed to combat misinformation and simplify how citizens track political activity. It gathers fragmented legislative data, transforms it into clear insights, and helps citizens easily answer the question that really matters: *"Are these politicians truly representing my interests?"*

---

## 🧠 What it does, in short

CivicMind is not just a data aggregator. It is an intelligent civic engine that:
* 🔎 **Collects data** automatically from government platforms (Chamber of Deputies, Senate, Just.ro).
* 🧹 **Normalizes and translates** bureaucratic jargon into human-readable text.
* 📊 **Calculates a personalized Impact Score** to track politician consistency.
* 💡 **Explains the context** of laws with clear Pro/Con arguments without "black boxes".
* 🎯 **Facilitates direct action** by allowing citizens to email their representatives effortlessly.

---

## ❗ The Problem

Politics is hard to follow, and data about laws and politicians is everywhere... and nowhere:
* **Government websites** are outdated, complex, and hard to navigate.
* **Legal texts** (PDFs, memorandums) are dense and full of bureaucratic jargon.
* **The Internet** is full of misinformation rather than evidence-backed facts.

👉 Nobody links a politician's electoral promises to their actual, day-to-day votes in a way that is useful for the everyday citizen.

---

## ✅ The Solution

CivicMind creates a personalized civic feed, combining all these sources and transforming them into an **Impact Score** and actionable insights for every user.

---

## 📊 What the User Sees

### 📄 Simplified Law Profile
A "smart report" for every new legislative project:
* AI-generated summary (3 key ideas).
* Direct impact categorization (Student, IT, Freelance/PFA, etc.).
* Clear PRO and CON arguments extracted from official sources.

### 📈 Personalized Impact Score
A clear metric tracking a politician's actions in the political ecosystem:
* Which laws they supported or opposed.
* Highlights ideological consistency or hypocrisy.

### 🔍 Explainability (No black boxes)
For every summary and score, you see:
* ✔️ What arguments support the law.
* ❌ What official institutions criticized it.
* 🕒 Where the original raw data came from.

---

## 🤖 AI Agents

CivicMind integrates a multi-agent architecture (using selfhosted Qwen 3.5 & LangGraph) directly into the data pipeline:

### 1. 🧠 Legislative Scout (The Analyst)
* Monitors raw data and processes explanatory memorandum PDFs.
* Translates legal language into natural language summaries.
* Classifies laws by societal impact.

### 2. ⚖️ Political Auditor (The Watchdog)
* Sends mass alerts to users when a law is being voted on that matches their profile.
* Calculates the Impact Score for each politician based on their voting record.

### 3. 📬 Civic Messenger (The Activator)
* Generates personalized email templates for citizens to contact their representatives.
* Facilitates direct communication between constituents and their elected officials.

---

## ⚙️ Core Features

* 🔎 **Automated Data Pipeline** from government APIs and sites.
* 📊 **AI Law Synthesis** (Summaries, Impact, Pro/Con).
* 📈 **Dynamic Impact Score** for politician accountability.
* 🔔 **Smart Push Alerts** triggered only by laws relevant to the user's profile.
* 👤 **Custom User Profiles** based on county and interests (Education, IT, etc.).
* 📧 **Civic Engagement Module** with AI-generated email templates to contact deputies.

---

## 🧪 User Stories

* **As a citizen who wants to stay updated**, I want the app to automatically display the newest legislative projects so that I don't have to manually search through difficult government websites.
* **As a voter demanding transparency**, I want to see exactly how each parliamentarian voted on finalized laws so that I can see if they truly represent my interests.
* **As a user who wants the full picture**, I want to be able to access the consolidated forms of laws directly in the app so I can read the final text if I need deeper context.
* **As a person without a legal background**, I want to view a simple summary of a law broken down into 3 key ideas so that I can quickly understand how it impacts society without reading a dense PDF.
* **As an objective voter**, I want to clearly understand the Pro and Con arguments for a law so that I can form my own unbiased opinion.
* **As a citizen tracking politician consistency**, I want to view a personalized Impact Score that compares what politicians stated versus how they actually voted so that I can hold them accountable.
* **As a new user**, I want to create a citizen profile by selecting my county and specific interests (like IT, Education, or Freelance) so that my feed is tailored strictly to the topics that matter to me.
* **As a busy professional**, I want to receive relevant Push alerts only when projects affecting my selected impact categories are being voted on so that I don't get overwhelmed by political noise.
* **As an engaged constituent who wants their voice heard**, I want to send an official email to my local deputy with a single click using AI templates so that I can easily express my polite support or protest without spending time writing a formal letter.
* **As an administrator maintaining trust**, I want automated checks to run before changes are merged so that broken builds, regressions, and unsafe agent changes are caught early.

---

## 🧱 High-Level Architecture

* **Frontend:** React + Vite + TypeScript SPA (using TanStack Router, TanStack Query, and Tailwind CSS)
* **Backend:** Django 6.0 + Django REST Framework (handles User authentication, Profile questionnaires, and cached metadata)
* **AI Service (FastAPI):** FastAPI + LangGraph (powers the multi-agent pipelines, scrapers, RAG, and personalization feed generation)
* **Database:** Supabase PostgreSQL (configured with `pgvector` for semantic document retrieval and HNSW indexing)

For complete diagrams including UML data schemas, component interactions, and multi-agent workflows, please see the detailed [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 🖥️ Local Development

This repo currently runs as two backend services plus the frontend:

* **Django** on `http://localhost:8000` for auth, profiles, and the frontend-facing `/api/*` routes.
* **FastAPI** on `http://localhost:8001` for the legislative intelligence service, agents, RAG, and scraping tooling.
* **Vite** on `http://localhost:5173` for the web frontend.

Important detail: the frontend should usually call Django through the Vite proxy, not by hardcoding `http://localhost:8000` in the browser. See [RUN.md](RUN.md) for the exact startup steps and port overrides.

---

## 🔁 Dev Process (AI-driven 💥)

### 📌 Backlog & Planning
* User stories formatted for both humans and AI agents.
* Prioritization tracked via Jira.

### 🔀 Source Control
* Git + feature branches.
* Pull requests required for merging.

### 🧪 Testing
* Unit and integration tests for the Django and FastAPI backends.
* Agent evals (Crucial for ensuring LLMs do not hallucinate legal data).

### 🤖 AI Usage
* Code generation and debugging.
* System Prompts validation.
* Data extraction schema building.

---

## 🛠️ Recent Backend Improvements (Refactoring)

The Django backend has recently undergone a major refactor to improve performance, maintainability, and data integrity:

*   **Serializer Refactoring**: Converted all core entities (Bills, MPs, Votes, Profiles) to `ModelSerializer` with optimized `Prefetch` logic to eliminate N+1 database queries.
*   **Pagination Standardization**: Implemented a unified pagination system across all list endpoints for consistent API responses.
*   **Search Service Extraction**: Extracted 250+ lines of monolithic search logic into a dedicated `SearchService`. Improved search to support entity-only queries (e.g., searching for a party or county now returns relevant MPs even without bill matches).
*   **Database Normalization**: Normalized the `ImpactScore` model and moved all models to `managed = True` status, allowing Django to handle schema migrations and enabling proper integration testing.
*   **Performance Optimization**: Implemented field limiting (`only()`) on heavy prefetches to reduce payload sizes for complex endpoints like the MP Vote Map.

---

## 📋 Product Backlog & Roadmap

### 🟢 Completed
- [x] Configure daily scraping scripts for `cdep.ro`.
- [x] Set up Supabase architecture and Django managed models.
- [x] Core API Refactoring (Serializers, Search, Pagination).
- [x] Define LangGraph workflow for the Scout Agent (`scout.py`).
- [x] Integration with the SOAP API at `legislatie.just.ro/apiws/FreeWebService.svc` (`legislatie_just.py`).
- [x] Refactor Backend Django Unit & Integration tests (Adhered to real database standards, 34 tests passing).
- [x] Setup & Refactor Frontend Unit & Integration testing suite (Vitest + JSDOM + MSW stateful mock DB, 51 tests passing).
- [x] Implement localized user profile form components (Romanian county selection combobox, interests section, AI complete, save confirmation modal).
- [x] Authentication Cleanup: Standardize auth views to exclusively use standard DRF/allauth flows.
- [x] Service Layer Expansion: Move feed personalization and vote analytics logic into dedicated service classes.
- [x] Onboarding Flow: Build onboarding wizard screens that prompt new users to select their county and interests upon first sign-in.
- [x] Agent 1 (Scout) Configuration: Enable processing of explanatory memorandum PDFs for AI summaries.
- [x] Impact Score Algorithm: Refine the calculation logic based on auditor metadata.
- [x] Add high-fidelity system diagrams (UML schemas, component boundaries, and agent workflows) to [ARCHITECTURE.md](ARCHITECTURE.md).
- [x] Add CI pipeline for frontend lint/test/build, backend checks/tests, and non-scraper AI service health checks.

### 🟡 Short-Term Backlog
*(No active items in the short-term backlog. Current roadmap milestones completed.)*

### 🔵 Icebox (Future Epics)
* **Social Sharing & Gamification:** Share a politician's "track record" on social media.
* **Local Level Expansion:** Scraper for Local Council / City Hall decisions (e.g., Bucharest, Cluj).

***
