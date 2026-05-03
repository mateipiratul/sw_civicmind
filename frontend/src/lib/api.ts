const configuredApiBaseUrl = import.meta.env.VITE_API_URL?.trim();
const API_BASE_URL =
  configuredApiBaseUrl && configuredApiBaseUrl !== "/"
    ? configuredApiBaseUrl.replace(/\/$/, "")
    : "";
const configuredAiBaseUrl = import.meta.env.VITE_AI_SERVICE_URL?.trim();
const AI_BASE_URL =
  configuredAiBaseUrl && configuredAiBaseUrl !== "/"
    ? configuredAiBaseUrl.replace(/\/$/, "")
    : API_BASE_URL;

// Types matching backend/apps/bills/models.py
export interface AIAnalysis {
  bill_idp: number;
  processed_at: string | null;
  model: string | null;
  title_short: string | null;
  key_ideas: string[];
  impact_categories: string[];
  affected_profiles: string[];
  arguments: Record<string, any>;
  pro_arguments: string[];
  con_arguments: string[];
  controversy_score: number | null;
  passed_by: string | null;
  dominant_party: string | null;
  vote_date: string | null;
  ocr_quality: string | null;
  confidence: number | null;
}

export interface Bill {
  idp: number;
  bill_number: string;
  title: string;
  initiator_name: string | null;
  initiator_type: string | null;
  status: string | null;
  procedure: string | null;
  law_type: string | null;
  decision_chamber: string | null;
  registered_at: string | null;
  adopted_at: string | null;
  source_url: string | null;
  scraped_at: string;
  
  // Document URLs
  doc_expunere_url: string | null;
  doc_forma_url: string | null;
  doc_aviz_ces_url: string | null;
  doc_aviz_cl_url: string | null;
  doc_adoptata_url: string | null;
  
  // AI Analysis (Enriched)
  ai_analysis?: AIAnalysis | null;
}

export interface VoteSession {
  idv: number;
  bill_idp: number;
  type: string | null;
  date: string | null;
  time: string | null;
  description: string | null;
  present: number;
  for_votes: number;
  against: number;
  abstain: number;
  absent: number;
  by_party: any[];
}

export interface PaginatedBills {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  bills: Bill[];
}

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

// User Profile (Managed by Django)
export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: "guest" | "user" | "admin";
  county?: string;
  interests?: string[];
  status: "active" | "suspended" | "banned" | "inactive";
  createdAt: string;
  token?: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

export interface ImpactScore {
  score: number;
  total_votes: number;
  for_count: number;
  against_count: number;
  abstain_count: number;
  absent_count: number;
  categories_voted: string[];
  narrative: string;
  calculated_at: string;
}

export interface Parliamentarian {
  mp_slug: string;
  mp_name: string;
  party: string;
  county: string;
  chamber: string;
  email?: string;
  impact_score?: ImpactScore | null;
}

export interface PaginatedMPs {
  count: number;
  next: string | null;
  previous: string | null;
  results: Parliamentarian[];
}

export interface BillVoteMP {
  mp_slug: string;
  mp_name: string;
  party: string;
  vote: string;
}

export interface BillVotesResponse {
  bill_idp: number;
  bill_number: string;
  vote_session: {
    date: string | null;
    type: string | null;
    description: string | null;
    summary: { present: number; for: number; against: number; abstain: number; absent: number };
  };
  votes: { for: BillVoteMP[]; against: BillVoteMP[]; abstain: BillVoteMP[]; absent: BillVoteMP[] };
}

export interface MPVote {
  vote: string;
  party: string;
  vote_date: string | null;
  vote_type: string | null;
  bill_idp: number;
  bill_number: string;
  bill_title: string;
  bill_status: string | null;
  title_short: string | null;
  impact_categories: string[];
  controversy_score: number | null;
}

export interface ParliamentarianDetail extends Parliamentarian {
  recent_votes: MPVote[];
}

export interface MPMetadata {
  counties: string[];
  parties: string[];
  chambers: Record<string, number>;
  hasCountyData: boolean;
}

export interface PaginatedMPList {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  parliamentarians: Parliamentarian[];
  filters?: { county?: string; party?: string | null; chamber?: string };
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalBills: number;
  activeBills: number;
  analyzedBills: number;
}

export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Custom Error class to carry status code
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// API Client
class ApiClient {
  private baseUrl: string;
  private aiBaseUrl: string;

  constructor(baseUrl: string, aiBaseUrl: string) {
    this.baseUrl = baseUrl;
    this.aiBaseUrl = aiBaseUrl;
  }

  private getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem("auth_token");
    if (!token) return {};
    return { Authorization: `Token ${token}` };
  };

  private requestTo = async <T>(baseUrl: string, endpoint: string, options: RequestInit = {}): Promise<T> => {
    const url = `${baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...this.getAuthHeader(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();

    if (!response.ok) {
      // Handle Django REST Framework validation errors (object with field names as keys)
      if (typeof data === 'object' && !Array.isArray(data) && !data.detail && !data.error) {
        const errors: string[] = [];
        for (const [field, messages] of Object.entries(data)) {
          if (Array.isArray(messages)) {
            errors.push(...messages.map(m => `${m}`));
          } else if (typeof messages === 'string') {
            errors.push(messages);
          }
        }
        if (errors.length > 0) {
          throw new ApiError(errors.join(", "), response.status);
        }
      }
      // Handle custom errors array format
      if (data.errors && Array.isArray(data.errors)) {
        const errorMessage = data.errors.map((e: any) => `${e.field}: ${e.message}`).join(", ");
        throw new ApiError(errorMessage, response.status);
      }
      throw new ApiError(data.detail || data.error || `API Error: ${response.status}`, response.status);
    }

    return data as T;
  };

  private request = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    return this.requestTo<T>(this.baseUrl, endpoint, options);
  };

  private normalizeAuthUser = (response: AuthResponse): User => ({
    ...response.user,
    token: response.token,
  });

  // Auth
  register = async (username: string, email: string, password: string): Promise<User> => {
    const response = await this.request<AuthResponse>("/api/auth/register/", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    return this.normalizeAuthUser(response);
  };
  login = async (username: string, password: string): Promise<User> => {
    const response = await this.request<AuthResponse>("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    return this.normalizeAuthUser(response);
  };

  // Bills
  listBills = async (category?: string, page = 1, limit = 20): Promise<PaginatedBills> => {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (category) q.append("category", category);
    return this.request(`/api/bills/?${q}`);
  };

  getBill = async (id: number): Promise<Bill> => {
    return this.request(`/api/bills/${id}/`);
  };

  getMetadata = async (): Promise<{ impact_categories: string[], affected_profiles: string[], counties: string[] }> => {
    return this.request("/api/bills/metadata/");
  };

  // Parliamentarians
  listMPs = async (params: { search?: string; county?: string; party?: string; page?: number; limit?: number } = {}): Promise<PaginatedMPList> => {
    const q = new URLSearchParams();
    if (params.search) q.append("search", params.search);
    if (params.county) q.append("county", params.county);
    if (params.party) q.append("party", params.party);
    if (params.page && params.page > 1) q.append("page", String(params.page));
    if (params.limit) q.append("limit", String(params.limit));
    return this.request(`/api/mps/?${q}`);
  };

  getMP = async (slug: string): Promise<Parliamentarian> => {
    return this.request(`/api/mps/${slug}/`);
  };

  getMPDetail = async (slug: string): Promise<ParliamentarianDetail> => {
    return this.request(`/api/mps/${slug}/`);
  };

  getMPMetadata = async (): Promise<MPMetadata> => {
    return this.request(`/api/mps/metadata/`);
  };

  getMyRepresentatives = async (county: string, params: { party?: string; page?: number; limit?: number } = {}): Promise<PaginatedMPList> => {
    const q = new URLSearchParams({ county });
    if (params.party) q.append("party", params.party);
    if (params.page && params.page > 1) q.append("page", String(params.page));
    if (params.limit) q.append("limit", String(params.limit));
    return this.request(`/api/mps/my-representatives/?${q}`);
  };

  getBillVotes = async (id: number): Promise<BillVotesResponse> => {
    return this.request(`/api/bills/${id}/votes/`);
  };

  getPersonalizedFeed = async (page = 1, limit = 10): Promise<PaginatedBills> => {
    return this.request(`/api/bills/personalized/?page=${page}&limit=${limit}`);
  };

  // User
  getProfile = async (): Promise<User> => { return this.request("/api/profiles/me/"); };
  updateProfile = async (data: Partial<User>): Promise<User> => {
    return this.request("/api/profiles/me/", { method: "PATCH", body: JSON.stringify(data) });
  };
  
  logout = async (): Promise<void> => { localStorage.removeItem("auth_token"); };

  // Admin
  getAdminStats = async (): Promise<AdminStats> => { return this.request("/api/admin/stats/"); };
  getAdminUsers = async (page = 1, limit = 20): Promise<PaginatedUsers> => {
    return this.request(`/api/admin/users?page=${page}&limit=${limit}`);
  };
  updateUserStatus = async (userId: number, status: User["status"]): Promise<User> => {
    return this.request(`/api/admin/users/${userId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  };
  getAdminBills = async (page = 1, limit = 20): Promise<PaginatedBills> => {
    return this.request(`/api/admin/bills?page=${page}&limit=${limit}`);
  };

  ragChat = async (question: string, options: RagChatOptions = {}): Promise<RagChatResponse> => {
    return this.requestTo<RagChatResponse>(this.aiBaseUrl, "/rag/chat", {
      method: "POST",
      body: JSON.stringify({
        question,
        top_k: options.top_k ?? 8,
        threshold: options.threshold ?? 0.72,
        source: options.source,
        bill_idp: options.bill_idp,
        exclude_bill_idp: options.exclude_bill_idp,
      }),
    });
  };

  streamRagChat = async (
    question: string,
    options: RagChatOptions = {},
    handlers: {
      onEvent?: (event: RagStreamEvent) => void;
    } = {},
  ): Promise<RagChatResponse> => {
    const response = await fetch(`${this.aiBaseUrl}/rag/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeader(),
      },
      body: JSON.stringify({
        question,
        top_k: options.top_k ?? 8,
        threshold: options.threshold ?? 0.72,
        source: options.source,
        bill_idp: options.bill_idp,
        exclude_bill_idp: options.exclude_bill_idp,
      }),
    });

    if (!response.ok) {
      let detail = `API Error: ${response.status}`;
      try {
        const data = await response.json();
        detail = data.detail || data.error || detail;
      } catch {
        // Ignore parse failures and keep the generic message.
      }
      throw new ApiError(detail, response.status);
    }

    if (!response.body) {
      return this.ragChat(question, options);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResponse: RagChatResponse | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const event = JSON.parse(trimmed) as RagStreamEvent;
        handlers.onEvent?.(event);
        if (event.type === "error") {
          throw new ApiError(event.error, 503);
        }
        if (event.type === "done") {
          finalResponse = {
            answer: event.answer,
            sources: event.sources,
            resolved_source: event.resolved_source,
            agent_mode: event.agent_mode,
          };
        }
      }
    }

    if (buffer.trim()) {
      const event = JSON.parse(buffer.trim()) as RagStreamEvent;
      handlers.onEvent?.(event);
      if (event.type === "done") {
        finalResponse = {
          answer: event.answer,
          sources: event.sources,
          resolved_source: event.resolved_source,
          agent_mode: event.agent_mode,
        };
      }
      if (event.type === "error") {
        throw new ApiError(event.error, 503);
      }
    }

    if (!finalResponse) {
      return this.ragChat(question, options);
    }

    return finalResponse;
  };
}

export const api = new ApiClient(API_BASE_URL, AI_BASE_URL);
