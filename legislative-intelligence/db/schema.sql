-- CivicMind Supabase schema
-- Run once in the Supabase SQL editor before using db/push_to_supabase.py.

create table if not exists public.bills (
    idp integer primary key,
    bill_number text,
    title text,
    initiator_name text,
    initiator_type text,
    status text,
    procedure text,
    law_type text,
    decision_chamber text,
    registered_at date,
    adopted_at date,
    source_url text,
    scraped_at timestamptz,
    doc_expunere_url text,
    doc_forma_url text,
    doc_aviz_ces_url text,
    doc_aviz_cl_url text,
    doc_adoptata_url text,
    ocr_expunere text,
    ocr_aviz_ces text,
    ocr_aviz_cl text
);

create table if not exists public.vote_sessions (
    idv integer primary key,
    bill_idp integer not null references public.bills(idp) on delete cascade,
    type text,
    date date,
    time text,
    description text,
    present integer,
    for_votes integer,
    against integer,
    abstain integer,
    absent integer,
    by_party jsonb not null default '[]'::jsonb
);

create table if not exists public.parliamentarians (
    mp_slug text primary key,
    mp_name text,
    party text
);

create table if not exists public.mp_votes (
    idv integer not null references public.vote_sessions(idv) on delete cascade,
    mp_slug text not null references public.parliamentarians(mp_slug) on delete cascade,
    party text,
    vote text,
    primary key (idv, mp_slug)
);

create table if not exists public.ai_analyses (
    bill_idp integer primary key references public.bills(idp) on delete cascade,
    processed_at timestamptz,
    model text,
    title_short text,
    key_ideas jsonb not null default '[]'::jsonb,
    impact_categories jsonb not null default '[]'::jsonb,
    affected_profiles jsonb not null default '[]'::jsonb,
    arguments jsonb not null default '{}'::jsonb,
    pro_arguments jsonb not null default '[]'::jsonb,
    con_arguments jsonb not null default '[]'::jsonb,
    controversy_score double precision,
    passed_by text,
    dominant_party text,
    vote_date date,
    ocr_quality text,
    confidence double precision
);

alter table public.ai_analyses add column if not exists title_short text;
alter table public.ai_analyses add column if not exists arguments jsonb not null default '{}'::jsonb;
alter table public.ai_analyses add column if not exists controversy_score double precision;
alter table public.ai_analyses add column if not exists passed_by text;
alter table public.ai_analyses add column if not exists dominant_party text;
alter table public.ai_analyses add column if not exists vote_date date;

create table if not exists public.impact_scores (
    mp_slug text primary key references public.parliamentarians(mp_slug) on delete cascade,
    score double precision,
    total_votes integer,
    for_count integer,
    against_count integer,
    abstain_count integer,
    absent_count integer,
    categories_voted jsonb not null default '[]'::jsonb,
    narrative text,
    calculated_at timestamptz
);

alter table public.impact_scores add column if not exists mp_name text;
alter table public.impact_scores add column if not exists party text;
alter table public.impact_scores add column if not exists categories_voted jsonb not null default '[]'::jsonb;
alter table public.impact_scores add column if not exists narrative text;

create table if not exists public.users (
    user_id text primary key,
    email text unique not null,
    name text,
    email_opt_in boolean not null default false,
    unsubscribed_at timestamptz,
    created_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
    user_id text primary key references public.users(user_id) on delete cascade,
    display_name text,
    auth_provider text,
    city text,
    county text,
    constituency text,
    occupation text,
    sector text,
    roles jsonb not null default '[]'::jsonb,
    interests jsonb not null default '[]'::jsonb,
    affected_profiles jsonb not null default '[]'::jsonb,
    followed_bills jsonb not null default '[]'::jsonb,
    followed_mps jsonb not null default '[]'::jsonb,
    language text not null default 'ro',
    explanation_preference text not null default 'brief',
    onboarding_completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
    user_id text primary key references public.users(user_id) on delete cascade,
    categories jsonb not null default '[]'::jsonb,
    profiles jsonb not null default '[]'::jsonb,
    flags jsonb not null default '[]'::jsonb,
    frequency text not null default 'weekly',
    min_importance text not null default 'normal',
    major_alerts boolean not null default true,
    updated_at timestamptz not null default now()
);

create table if not exists public.bill_events (
    event_key text primary key,
    event_type text not null,
    idp integer not null references public.bills(idp) on delete cascade,
    idv integer references public.vote_sessions(idv) on delete cascade,
    bill_number text,
    source text not null default 'cdep',
    chamber text not null default 'deputies',
    vote_date date,
    summary jsonb not null default '{}'::jsonb,
    detected_at timestamptz not null
);

create table if not exists public.bill_flags (
    event_key text primary key references public.bill_events(event_key) on delete cascade,
    idp integer not null references public.bills(idp) on delete cascade,
    idv integer references public.vote_sessions(idv) on delete cascade,
    bill_number text,
    event_type text not null,
    importance text not null,
    flags jsonb not null default '[]'::jsonb,
    classified_at timestamptz not null
);

create table if not exists public.notification_jobs (
    job_id text primary key,
    event_key text not null references public.bill_events(event_key) on delete cascade,
    user_id text not null references public.users(user_id) on delete cascade,
    email text not null,
    status text not null default 'queued',
    frequency text not null default 'weekly',
    importance text not null default 'normal',
    matched_flags jsonb not null default '[]'::jsonb,
    subject text,
    body text,
    created_at timestamptz not null,
    queued_at timestamptz,
    sent_at timestamptz,
    error text
);

create table if not exists public.notification_deliveries (
    id bigint generated always as identity primary key,
    delivery_id text unique,
    job_id text not null references public.notification_jobs(job_id) on delete cascade,
    provider text,
    provider_message_id text,
    status text not null,
    delivered_at timestamptz,
    error text,
    created_at timestamptz not null default now()
);

create table if not exists public.unsubscribe_tokens (
    token text primary key,
    user_id text not null references public.users(user_id) on delete cascade,
    email text not null,
    created_at timestamptz not null default now(),
    used_at timestamptz
);

create index if not exists idx_bills_status on public.bills(status);
create index if not exists idx_vote_sessions_bill_idp on public.vote_sessions(bill_idp);
create index if not exists idx_vote_sessions_date on public.vote_sessions(date);
create index if not exists idx_parliamentarians_party on public.parliamentarians(party);
create index if not exists idx_mp_votes_mp_slug on public.mp_votes(mp_slug);
create index if not exists idx_impact_scores_score on public.impact_scores(score desc);
create index if not exists idx_bill_events_idp on public.bill_events(idp);
create index if not exists idx_bill_events_detected_at on public.bill_events(detected_at desc);
create index if not exists idx_bill_flags_importance on public.bill_flags(importance);
create index if not exists idx_notification_jobs_status on public.notification_jobs(status);
create index if not exists idx_notification_jobs_user_id on public.notification_jobs(user_id);
create index if not exists idx_user_profiles_interests on public.user_profiles using gin(interests);
create index if not exists idx_user_profiles_affected_profiles on public.user_profiles using gin(affected_profiles);
create index if not exists idx_user_profiles_followed_bills on public.user_profiles using gin(followed_bills);
