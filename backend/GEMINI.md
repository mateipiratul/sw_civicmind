# 🤖 GEMINI.md: Hybrid Backend Architect Context

## 🎯 Project Vision
**CivicMind** is an intelligent civic engine designed to combat political misinformation. It transforms fragmented legislative data into a simplified, personalized feed for citizens, featuring AI-generated summaries and **Impact Scores** for politicians.

## 🛠️ Technical Stack (Hybrid Backend)
* **Repo 1 (`civicmind-api-core`):** Django + DRF. Handles User Auth, Profiles, and the Admin Dashboard.
* **Repo 2 (`civicmind-ai-service`):** FastAPI. Handles AI Agents, RAG Chatbot, and Scraper Ingestion.
* **Database/Auth:** Supabase (PostgreSQL + pgvector).
* **Deployment Goal:** 40-hour MVP sprint.

## 🗄️ Database & IDE Integration
* **Direct Connection:** Connect local IDEs to the remote Supabase instance via `DATABASE_URL` in `.env`.
* **Tables:**
    * `bills`, `vote_sessions`, `parliamentarians`, `mp_votes` (Populated by Scraper).
    * `ai_analyses`, `impact_scores` (Populated by LangGraph Agents).
    * `profiles` (Managed by Django for User Interests/County).

## 🚀 Core Responsibilities

### 1. Django (Core & Auth)
* Implement `POST /auth/register` and `POST /auth/login`.
* Manage the `Profile` model: Store user `county` and `interests`.
* Enrich `parliamentarians`: Populate `email` and `county` fields to bridge the scraper data.

### 2. FastAPI (AI & Feed)
* `GET /bills`: Fetch laws with their `ai_analyses` summary.
* `GET /bills/{idp}/chat`: The RAG Chatbot endpoint (Vector search in `project_chunks`).
* `POST /generate-email`: Use the Messenger Agent to draft an email to an MP.

### 3. Personalization Logic (The "Pinterest" Feed)
* Filter the `bills` table by matching the `impact_categories` JSON field with the user's `interests` array stored in their Django profile.

## ⚠️ Implementation Rules
1.  **Handle Nulls:** AI data and Impact Scores will be `null` until agents finish. Return `null` to frontend; do not crash.
2.  **CORS:** Ensure `django-cors-headers` is configured to allow requests from the React frontend.
3.  **Security:** Django handles User Auth; FastAPI uses the `SERVICE_ROLE_KEY` for AI-driven database writes.

## 🔑 Environment Variables
* `DATABASE_URL`: Postgres URI for Django.
* `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`: For FastAPI/Scraper.
* `OPENAI_API_KEY`: For the Messenger and Scout Agents.
