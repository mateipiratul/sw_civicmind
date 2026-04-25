-- CivicMind RAG schema
-- Run after db/schema.sql. This keeps the vector-search surface separate
-- while the RAG pipeline is still evolving.

create extension if not exists vector with schema extensions;

create table if not exists public.legislation_documents (
    document_id text primary key,
    source text not null,
    external_id text,
    bill_idp integer references public.bills(idp) on delete cascade,
    bill_number text,
    title text,
    document_type text not null,
    source_url text,
    publication text,
    issuer text,
    effective_date date,
    content_hash text not null,
    metadata jsonb not null default '{}'::jsonb,
    indexed_at timestamptz not null default now()
);

create table if not exists public.legislation_chunks (
    chunk_id text primary key,
    document_id text not null references public.legislation_documents(document_id) on delete cascade,
    source text not null,
    external_id text,
    bill_idp integer references public.bills(idp) on delete cascade,
    chunk_index integer not null,
    content text not null,
    content_hash text not null,
    embedding extensions.vector(1024) not null,
    metadata jsonb not null default '{}'::jsonb,
    indexed_at timestamptz not null default now()
);

create table if not exists public.rag_query_logs (
    id bigint generated always as identity primary key,
    query text not null,
    filters jsonb not null default '{}'::jsonb,
    result_chunk_ids jsonb not null default '[]'::jsonb,
    result_scores jsonb not null default '[]'::jsonb,
    model text,
    created_at timestamptz not null default now()
);

create index if not exists idx_legislation_documents_source on public.legislation_documents(source);
create index if not exists idx_legislation_documents_external_id on public.legislation_documents(external_id);
create index if not exists idx_legislation_documents_bill_idp on public.legislation_documents(bill_idp);
create index if not exists idx_legislation_documents_metadata on public.legislation_documents using gin(metadata);
create index if not exists idx_legislation_chunks_document_id on public.legislation_chunks(document_id);
create index if not exists idx_legislation_chunks_source on public.legislation_chunks(source);
create index if not exists idx_legislation_chunks_bill_idp on public.legislation_chunks(bill_idp);
create index if not exists idx_legislation_chunks_metadata on public.legislation_chunks using gin(metadata);
create index if not exists idx_legislation_chunks_embedding_hnsw
    on public.legislation_chunks
    using hnsw (embedding vector_cosine_ops);

create or replace function public.match_legislation_chunks(
    query_embedding extensions.vector(1024),
    match_threshold double precision default 0.72,
    match_count integer default 10,
    filter_source text default null,
    filter_bill_idp integer default null,
    filter_document_type text default null,
    exclude_bill_idp integer default null
)
returns table (
    chunk_id text,
    document_id text,
    source text,
    external_id text,
    bill_idp integer,
    chunk_index integer,
    content text,
    metadata jsonb,
    source_url text,
    title text,
    document_type text,
    similarity double precision
)
language sql
stable
as $$
    select
        c.chunk_id,
        c.document_id,
        c.source,
        c.external_id,
        c.bill_idp,
        c.chunk_index,
        c.content,
        c.metadata,
        d.source_url,
        d.title,
        d.document_type,
        1 - (c.embedding <=> query_embedding) as similarity
    from public.legislation_chunks c
    join public.legislation_documents d on d.document_id = c.document_id
    where (filter_source is null or c.source = filter_source)
      and (filter_bill_idp is null or c.bill_idp = filter_bill_idp)
      and (filter_document_type is null or d.document_type = filter_document_type)
      and (exclude_bill_idp is null or c.bill_idp is null or c.bill_idp <> exclude_bill_idp)
      and (c.embedding <=> query_embedding) < 1 - match_threshold
    order by c.embedding <=> query_embedding asc
    limit least(greatest(match_count, 1), 30);
$$;
