# 🏛️ CivicMind System Architecture & Design References

This document outlines the component architecture, ingestion pipelines, agentic execution workflows, and data models of the **CivicMind** platform.

---

## 🧱 1. Component Architecture

CivicMind is designed as a modular civic-tech platform split into three primary layers, communicating with a shared data store.

```mermaid
flowchart TB
    subgraph Frontend ["💻 CITIZEN FRONTEND (React + Vite)"]
        SPA["React SPA (frontend/)"]
        Router["TanStack Router (Routing)"]
        Query["TanStack Query (Data Fetching)"]
        Tailwind["Tailwind CSS (UI & Theme)"]
        SPA --> Router
        SPA --> Query
        SPA --> Tailwind
    end

    subgraph BackendGateway ["🔒 BACKEND GATEWAY (Django 6.0)"]
        Django["Django App (backend/)"]
        DRF["Django REST Framework (DRF)"]
        AuthService["Authentication Service (Token / Google OAuth)"]
        ProfileService["Profile Service (Questionnaires & Derivations)"]
        Django --> DRF
        Django --> AuthService
        Django --> ProfileService
    end

    subgraph AIService ["🧠 AI & AGENT SERVICE (FastAPI)"]
        FastAPI["FastAPI App (legislative-intelligence/)"]
        Scraper["Legislation Scrapers (cdep.ro / SOAP legislatie.just.ro)"]
        LangGraph["LangGraph Workflow Engine (Multi-Agent)"]
        RAG["RAG Semantic Engine (Mistral Embeddings)"]
        FastAPI --> Scraper
        FastAPI --> LangGraph
        FastAPI --> RAG
    end

    subgraph DB ["💾 DATABASE & CORPUS LAYER (Supabase / Postgres)"]
        PG["PostgreSQL DB"]
        PGVector["pgvector Extension (HNSW Indexing)"]
        RPC["match_legislation_chunks() SQL RPC"]
    end

    %% Interactions
    SPA -- "HTTP /api (Proxy)" --> Django
    SPA -- "HTTP /mps, /rag, /qa (API)" --> FastAPI
    Django -- "psycopg2 Pooler" --> PG
    FastAPI -- "SQL / REST Client" --> DB
    Scraper -- "Mistral OCR 3" --> FastAPI
```

---

## 🔁 2. Core Processing Workflows

### 📥 Data Ingestion & Enrichment Pipeline
This workflow processes raw government data and runs agentic steps to output clean legislative insights.

```mermaid
flowchart TD
    Start([Start Ingestion Run]) --> ScrapeCDEP[Scrape cdep.ro for Final Votes & PL Bills]
    ScrapeCDEP --> SaveRawJSON[Save raw JSON to data/raw/]
    SaveRawJSON --> OCRCheck{PDF documents present?}
    
    OCRCheck -- Yes --> DownloadPDF[Download PDF bytes via requests]
    DownloadPDF --> MistralOCR[Process via Mistral OCR API]
    MistralOCR --> EmbedOCR[Embed OCR markdown in raw JSON]
    OCRCheck -- No --> RunScout[Invoke Agent 1: Scout LangGraph]
    
    EmbedOCR --> RunScout
    RunScout --> GenAnalysis[Generate ai_analysis structure]
    GenAnalysis --> SaveAnalysis[Save ai_analysis into bill JSON]
    
    SaveAnalysis --> RunAuditor[Invoke Agent 2: Auditor LangGraph]
    RunAuditor --> AggVotes[Aggregate MP Votes & participation stats]
    AggVotes --> ComputeScores[Compute Impact Scores & LLM Narratives]
    ComputeScores --> SaveScores[Save impact_scores.json]
    
    SaveScores --> PushSupabase[Run push_to_supabase.py]
    PushSupabase --> DBUpdate[(Supabase DB Tables updated)]
    DBUpdate --> End([Pipeline execution complete])
```

---

### 🤖 LangGraph Multi-Agent Nodes

#### Agent 1: Legislative Scout (`agents/scout.py`)
Analyzes raw bill data and explanatory memorandums, producing short titles, key ideas, impact profiles, and arguments.

```mermaid
flowchart LR
    load_bill[load_bill] --> truncate_context[truncate_context]
    truncate_context --> extract_structure[extract_structure]
    extract_structure --> extract_opposition[extract_opposition]
    extract_opposition --> compute_vote_metadata[compute_vote_metadata]
    compute_vote_metadata --> assemble[assemble]
    assemble --> save[save]
```

#### Agent 2: Political Auditor (`agents/auditor.py`)
Computes parliamentarians' participation/decisiveness scores and calls Mistral to write custom narrative overviews.

```mermaid
flowchart LR
    load_votes[load_votes] --> calculate_scores[calculate_scores]
    calculate_scores --> generate_narratives[generate_narratives]
    generate_narratives --> save_auditor[save]
```

---

### 🔍 RAG Retrieval & Streaming Chat Flow
How similarity search is executed over the vector database and streamed in real-time to the citizen's browser.

```mermaid
sequenceDiagram
    autonumber
    actor Citizen as Citizen Browser
    participant API as FastAPI (:8001)
    participant RAG as RAG Tooling
    participant DB as Supabase pgvector
    participant LLM as Mistral AI

    Citizen->>API: POST /rag/chat/stream (question, conversation history)
    API->>RAG: Call stream_rag_chat_events()
    RAG->>LLM: Embed user query (mistral-embed)
    LLM-->>RAG: Return 1024-dim vector
    RAG->>DB: Call match_legislation_chunks() RPC (cosine distance)
    DB-->>RAG: Return top matching chunks & metadata (CDEP + Portal Legislativ)
    RAG->>RAG: Apply hybrid reranking (overlap + diversity penalty)
    RAG->>LLM: Send LangGraph ReAct Prompt (Grounded context + chunks)
    loop Stream Response
        LLM-->>API: Stream token events (NDJSON)
        API-->>Citizen: Flush SSE tokens & inferred citations
    end
```

---

## 📊 3. UML Data Schema (Supabase ERD)

This class diagram represents the database tables, fields, and relational layout inside Supabase Postgres.

```mermaid
classDiagram
    class User {
        +int id (PK)
        +string username
        +string email
        +string password
    }

    class Profile {
        +int id (PK)
        +int user_id (FK)
        +string county
        +string preferred_party
        +list interests
        +list persona_tags
        +string work_domain
        +string employment_status
        +list personal_interest_areas
        +string age_range
        +string housing_status
        +list mobility_modes
        +list education_context
        +list energy_focus
        +list public_service_focus
        +string avatar_url
        +boolean questionnaire_completed
    }

    class Bill {
        +bigint idp (PK)
        +string bill_number (Unique)
        +string title
        +string initiator_name
        +string initiator_type
        +string status
        +date registered_at
        +date adopted_at
        +string source_url
    }

    class VoteSession {
        +bigint idv (PK)
        +bigint bill_idp (FK)
        +date date
        +time time
        +string type
        +string description
        +int present
        +int for_votes
        +int against
        +int abstain
        +int absent
    }

    class Parliamentarian {
        +string mp_slug (PK)
        +string mp_name
        +string party
        +string chamber
        +string email
        +string county
    }

    class MPVote {
        +int id (PK)
        +bigint idv (FK)
        +string mp_slug (FK)
        +string party
        +string vote
    }

    class ImpactScore {
        +string mp_slug (PK, FK)
        +float score
        +int total_votes
        +int for_count
        +int against_count
        +int abstain_count
        +int absent_count
        +list categories_voted
        +text narrative
        +datetime calculated_at
    }

    class AIAnalysis {
        +bigint bill_idp (PK, FK)
        +datetime processed_at
        +string model
        +string title_short
        +list key_ideas
        +list impact_categories
        +list affected_profiles
        +json arguments
        +float controversy_score
        +string passed_by
        +string dominant_party
        +date vote_date
    }

    class LegislationDocument {
        +string document_id (PK)
        +bigint bill_idp (FK)
        +string bill_number
        +string document_type
        +string source_url
        +string content_hash
        +jsonb metadata
        +datetime indexed_at
    }

    class LegislationChunk {
        +string chunk_id (PK)
        +string document_id (FK)
        +bigint bill_idp (FK)
        +int chunk_index
        +text content
        +string content_hash
        +vector embedding
        +jsonb metadata
        +datetime indexed_at
    }

    %% Relationships
    User "1" -- "1" Profile : has
    Bill "1" -- "0..*" VoteSession : has
    Bill "1" -- "0..1" AIAnalysis : owns
    Bill "1" -- "0..* " LegislationDocument : contains
    VoteSession "1" -- "0..*" MPVote : logs
    Parliamentarian "1" -- "0..*" MPVote : casts
    Parliamentarian "1" -- "0..1" ImpactScore : evaluates
    LegislationDocument "1" -- "0..*" LegislationChunk : segmented_into
    Bill "1" -- "0..*" LegislationChunk : queries
```
