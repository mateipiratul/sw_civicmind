export interface RagSource {
  chunk_id: string;
  document_id: string;
  source: string | null;
  external_id?: string | null;
  bill_idp?: number | null;
  chunk_index?: number;
  content: string;
  source_url?: string | null;
  title?: string | null;
  document_type?: string | null;
  similarity?: number | null;
  score?: number | null;
}

export interface RagChatResponse {
  answer: string;
  sources: RagSource[];
  resolved_source?: string | null;
  agent_mode?: string | null;
}

export type RagStreamEvent =
  | { type: "start"; agent_mode?: string | null; resolved_source?: string | null }
  | { type: "token"; delta: string }
  | { type: "sources"; items: RagSource[] }
  | { type: "done"; answer: string; sources: RagSource[]; resolved_source?: string | null; agent_mode?: string | null }
  | { type: "error"; error: string };

export interface RagChatOptions {
  source?: string;
  bill_idp?: number;
  exclude_bill_idp?: number;
  top_k?: number;
  threshold?: number;
}
