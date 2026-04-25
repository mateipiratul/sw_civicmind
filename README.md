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

---

## 🧱 High-Level Architecture

* **Frontend:** React Native / Flutter
* **Backend:** Python *(Django, FastAPI)*
* **Data Ingestion Layer (ETL):** Firecrawl API, Python
* **AI Agents Layer:** selfhosted Qwen 3.5, LangGraph
* **Database:** PostgreSQL *(Supabase)*

---

## 🔁 Dev Process (AI-driven 💥)

### 📌 Backlog & Planning
* User stories formatted for both humans and AI agents.
* Prioritization tracked via Jira.

### 🔀 Source Control
* Git + feature branches.
* Pull requests required for merging.

### 🧪 Testing
* Unit tests for the Spring Boot backend.
* Agent evals (Crucial for ensuring Qwen 3.5 does not hallucinate legal data).

### 🤖 AI Usage
* Code generation and debugging.
* System Prompts validation.
* Data extraction schema building.

---

## 📋 Product Backlog & Roadmap (Future Vision)

### 🟢 Current Sprint (MVP Data)
- Configure daily Firecrawl script for `cdep.ro`.
- Set up Supabase architecture.
- Define LangGraph workflow for the Scout Agent.
Here is the English translation of your technical tasks:

- XML/HTML parsing to extract the idp (Project ID).
- Scraping on `evot2015.nominal?idv=` using Firecrawl with a JSON extraction schema.
- Integration with the SOAP API at `legislatie.just.ro/apiws/FreeWebService.svc`.

### 🟡 Short-Term Backlog
- Create Figma design for Onboarding screens.
- Implement Python backend endpoints.
- Integrate push notifications.
- Configuring Agent 1 (Scout) to process explanatory memorandum PDFs.
- Implementing the logic to extract critiques from the official opinions of the Economic and Social Council.
- Possible development of a calculation algorithm (Impact Score) based on the metadata extracted by Agent 2 (Auditor).
- UI/UX for onboarding (Selecting County + Interests: Freelancer/PFA, IT, Education).
- Integrating a notification system based on filtering impact categories.

### 🔵 Icebox (Future Epics)
* **Social Sharing & Gamification:** Share a politician's "track record" on social media.
* **Local Level Expansion:** Scraper for Local Council / City Hall decisions (e.g., Bucharest, Cluj).

***
