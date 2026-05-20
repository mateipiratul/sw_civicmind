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

// --- Interfaces ---

/**
 * AI Analysis data for a bill, matching backend/apps/bills/serializers.py (AIAnalysisSerializer)
 */
export interface AIAnalysis {
  bill_idp: number;
  processed_at: string | null;
  model: string | null;
  title_short: string | null;
  impact_categories: string[];
  affected_profiles: string[];
  key_ideas: string[];
  arguments: Record<string, string>;
  pro_arguments: string[];
  con_arguments: string[];
  controversy_score: number | null;
  passed_by: string | null;
  dominant_party: string | null;
  vote_date: string | null;
  ocr_quality: string | null;
  confidence: number | null;
}

/**
 * Core Bill model data, matching backend/apps/bills/models.py
 */
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
  
  // OCR Content (optional, usually only in detail)
  ocr_expunere?: string | null;
  ocr_aviz_ces?: string | null;
  ocr_aviz_cl?: string | null;

  // AI Analysis (Enriched)
  ai_analysis?: AIAnalysis | null;
}

/**
 * Voting breakdown by party for a session
 */
export interface PartyVoteResult {
  party: string;
  for: number;
  against: number;
  abstain: number;
  absent: number;
}

/**
 * Vote session data, matching backend/apps/bills/serializers.py (VoteSessionSerializer)
 */
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
  by_party: PartyVoteResult[];
}

/**
 * Common pagination structure from backend StandardPagination
 */
export interface PaginatedResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedBills extends PaginatedResponse {
  bills: Bill[];
}

/**
 * Combined User + Profile information, matching backend/apps/authentication and apps/profiles
 */
export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: "guest" | "user" | "admin" | "staff";
  
  // Profile fields (from ProfileSerializer)
  county?: string | null;
  preferred_party?: string | null;
  interests?: string[];
  persona_tags?: string[];
  work_domain?: string | null;
  employment_status?: string | null;
  personal_interest_areas?: string[];
  age_range?: string | null;
  housing_status?: string | null;
  mobility_modes?: string[];
  education_context?: string[];
  energy_focus?: string[];
  public_service_focus?: string[];
  questionnaire_completed?: boolean;
  
  status: "active" | "suspended" | "banned" | "inactive";
  createdAt: string;
  token?: string;
}

/**
 * Impact score and summary for a parliamentarian
 */
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

/**
 * Parliamentarian data, matching backend/apps/parliamentarians/models.py
 */
export interface Parliamentarian {
  mp_slug: string;
  mp_name: string;
  party: string;
  county: string;
  chamber: string;
  email?: string;
  impact_score?: ImpactScore | null;
}

export interface PaginatedMPList extends PaginatedResponse {
  parliamentarians: Parliamentarian[];
  filters?: { county?: string; party?: string | null; chamber?: string };
}

/**
 * A single MP's vote on a specific bill
 */
export interface BillVoteMP {
  mp_slug: string;
  mp_name: string;
  party: string;
  vote: string;
}

/**
 * Detailed vote response for a bill, matching BillViewSet.votes action
 */
export interface BillVotesResponse {
  bill_idp: number;
  bill_number: string;
  vote_session: {
    date: string | null;
    type: string | null;
    description: string | null;
    summary: { 
      present: number; 
      for: number; 
      against: number; 
      abstain: number; 
      absent: number 
    };
  };
  votes: { 
    for: BillVoteMP[]; 
    against: BillVoteMP[]; 
    abstain: BillVoteMP[]; 
    absent: BillVoteMP[] 
  };
}

/**
 * Minimal vote record for a parliamentarian's history
 */
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

/**
 * Detailed parliamentarian profile with voting history
 */
export interface ParliamentarianDetail extends Parliamentarian {
  recent_votes: MPVote[];
}

/**
 * Filter and distribution metadata for the MP directory
 */
export interface MPMetadata {
  counties: string[];
  parties: string[];
  chambers: Record<string, number>;
  hasCountyData: boolean;
}

export interface TrendingTopic {
  label: string;
  count: number;
}

/**
 * Data relating an MP to a specific search keyword/bill set
 */
export interface SearchMPRelation {
  keyword: string;
  billIds: number[];
  billNumbers: string[];
  relatedBills: number;
  totalMatchedBills?: number;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  absentVotes: number;
}

export interface SearchMP extends Parliamentarian {
  relation?: SearchMPRelation;
}

/**
 * Global search result structure, matching GlobalSearchView
 */
export interface GlobalSearchFilters {
  laws: {
    statuses: string[];
    initiators: string[];
    categories: string[];
  };
  mps: {
    parties: string[];
    counties: string[];
    chambers: string[];
  };
}

export interface GlobalSearchResponse {
  query: string;
  exactMatch: Bill | null;
  laws: Bill[];
  mps: SearchMP[];
  filters: GlobalSearchFilters;
  counts: {
    laws: number;
    mps: number;
  };
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalBills: number;
  activeBills: number;
  analyzedBills: number;
}

export interface PaginatedUsers extends PaginatedResponse {
  users: User[];
}

// --- RAG Types ---

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

// --- API Client Implementation ---

/**
 * Custom Error class to carry HTTP status and structured messages
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface AuthKeyResponse {
  key: string;
}

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

  private getCsrfToken = (): string | null => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^|; )' + 'csrftoken' + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : null;
  };

  /**
   * Generic request handler with CSRF and Auth injection
   */
  private requestTo = async <T>(baseUrl: string, endpoint: string, options: RequestInit = {}): Promise<T> => {
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    const csrfToken = this.getCsrfToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      ...this.getAuthHeader(),
      ...(options.headers as Record<string, string> | undefined),
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get("content-type") || "";
    let data: any;
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        if (!response.ok) {
          throw new ApiError(`Server error (${response.status}).`, response.status);
        }
        return {} as T;
      }
    }

    if (!response.ok) {
      // Handle Django REST Framework validation errors (field-specific)
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const errorObj = data as Record<string, any>;
        if (!errorObj.detail && !errorObj.error) {
          const errors: string[] = [];
          for (const [field, messages] of Object.entries(errorObj)) {
            const fieldPrefix = field === "non_field_errors" || field === "detail" ? "" : `${field}: `;
            if (Array.isArray(messages)) {
              errors.push(...messages.map(m => `${fieldPrefix}${m}`));
            } else if (typeof messages === 'string') {
              errors.push(`${fieldPrefix}${messages}`);
            }
          }
          if (errors.length > 0) {
            throw new ApiError(errors.join(", "), response.status);
          }
        }
      }
      
      const errorObj = data as Record<string, any> | null;
      const detailMsg = errorObj?.detail || errorObj?.error || `API Error: ${response.status}`;
      throw new ApiError(String(detailMsg), response.status);
    }

    return data as T;
  };

  private request = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    return this.requestTo<T>(this.baseUrl, endpoint, options);
  };

  // --- Auth & Identity ---

  /**
   * Registers a new user and automatically logs them in (fetches full profile)
   */
  register = async (username: string, email: string, password: string): Promise<User> => {
    await this.requestTo(this.baseUrl, "/api/auth/csrf/", { method: "GET" });
    const response = await this.request<AuthKeyResponse>("/api/auth/register/", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    localStorage.setItem("auth_token", response.key);
    return this.getProfile();
  };

  /**
   * Authenticates user and fetches full profile data
   */
  login = async (username: string, password: string): Promise<User> => {
    await this.requestTo(this.baseUrl, "/api/auth/csrf/", { method: "GET" });
    const response = await this.request<AuthKeyResponse>("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem("auth_token", response.key);
    return this.getProfile();
  };

  googleLogin = async (accessToken: string): Promise<User> => {
    const response = await this.request<AuthKeyResponse>("/api/auth/google/", {
      method: "POST",
      body: JSON.stringify({ access_token: accessToken }),
    });
    localStorage.setItem("auth_token", response.key);
    return this.getProfile();
  };

  googleLoginWithCode = async (code: string): Promise<User> => {
    const response = await this.request<AuthKeyResponse>("/api/auth/google/", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    localStorage.setItem("auth_token", response.key);
    return this.getProfile();
  };

  requestPasswordReset = async (email: string): Promise<void> => {
    await this.requestTo(this.baseUrl, "/api/auth/csrf/", { method: "GET" });
    await this.request("/api/auth/password/reset/", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  };

  confirmPasswordReset = async (data: { uid: string; token: string; new_password?: string; password?: string }): Promise<void> => {
    await this.requestTo(this.baseUrl, "/api/auth/csrf/", { method: "GET" });
    await this.request("/api/auth/password/reset/confirm/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  };

  logout = async (): Promise<void> => {
    localStorage.removeItem("auth_token");
  };

  // --- Profile & Personalization ---

  getProfile = async (): Promise<User> => {
    return this.request("/api/profiles/me/");
  };

  updateProfile = async (data: Partial<User>): Promise<User> => {
    return this.request("/api/profiles/me/", { method: "PATCH", body: JSON.stringify(data) });
  };

  /**
   * Fetches metadata for the interest/persona questionnaire
   */
  getQuestionnaireMetadata = async (): Promise<any> => {
    return this.request("/api/profiles/questionnaire/");
  };

  deleteAccount = async (password: string): Promise<void> => {
    await this.requestTo(this.baseUrl, "/api/auth/csrf/", { method: "GET" });
    await this.request("/api/profiles/me/", { method: "DELETE", body: JSON.stringify({ password }) });
  };

  // --- Bills ---

  listBills = async (category?: string, page = 1, limit = 20): Promise<PaginatedBills> => {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (category) q.append("category", category);
    return this.request(`/api/bills/?${q}`);
  };

  getBill = async (id: number): Promise<Bill> => {
    return this.request(`/api/bills/${id}/`);
  };

  getBillVotes = async (id: number): Promise<BillVotesResponse> => {
    return this.request(`/api/bills/${id}/votes/`);
  };

  getMetadata = async (): Promise<{ impact_categories: string[], affected_profiles: string[], counties: string[] }> => {
    return this.request("/api/bills/metadata/");
  };

  getTrendingTopics = async (): Promise<{ topics: TrendingTopic[] }> => {
    return this.request("/api/bills/trending/");
  };

  getPersonalizedFeed = async (page = 1, limit = 20): Promise<PaginatedBills> => {
    return this.request(`/api/bills/personalized/?page=${page}&limit=${limit}`);
  };

  // --- Parliamentarians ---

  listMPs = async (params: { search?: string; county?: string | null; party?: string; page?: number; limit?: number } = {}): Promise<PaginatedMPList> => {
    const q = new URLSearchParams();
    if (params.search) q.append("search", params.search);
    if (params.county) q.append("county", params.county);
    if (params.party) q.append("party", params.party);
    if (params.page) q.append("page", String(params.page));
    if (params.limit) q.append("limit", String(params.limit));
    return this.request(`/api/mps/?${q}`);
  };

  getMP = async (slug: string): Promise<Parliamentarian> => {
    return this.request(`/api/mps/${slug}/`);
  };

  getMPDetail = async (slug: string, params: { billIds?: number[]; billNumbers?: string[] } = {}): Promise<ParliamentarianDetail> => {
    const q = new URLSearchParams();
    if (params.billNumbers?.length) q.append("bill_numbers", params.billNumbers.join(","));
    else if (params.billIds?.length) q.append("bill_ids", params.billIds.join(","));
    const suffix = q.toString() ? `?${q}` : "";
    return this.request(`/api/mps/${slug}/${suffix}`);
  };

  getMPMetadata = async (): Promise<MPMetadata> => {
    return this.request(`/api/mps/metadata/`);
  };

  getMyRepresentatives = async (county: string, params: { party?: string; page?: number; limit?: number } = {}): Promise<PaginatedMPList> => {
    const q = new URLSearchParams({ county });
    if (params.party) q.append("party", params.party);
    if (params.page) q.append("page", String(params.page));
    if (params.limit) q.append("limit", String(params.limit));
    return this.request(`/api/mps/my-representatives/?${q}`);
  };

  // --- Global Search ---

  /**
   * Executes a cross-entity search (Laws + MPs)
   */
  searchGlobal = async (query: string): Promise<GlobalSearchResponse> => {
    const q = new URLSearchParams({ q: query });
    return this.request(`/api/search/?${q}`);
  };

  // --- AI / RAG Agents ---

  /**
   * Uses AI to analyze natural language onboarding text and derive county/interests
   */
  analyzeOnboardingProfile = async (text: string, available_counties: string[], available_categories: string[]): Promise<{county: string | null, interests: string[]}> => {
    return this.requestTo(this.aiBaseUrl, "/profiles/analyze-onboarding", {
      method: "POST",
      body: JSON.stringify({ text, available_counties, available_categories })
    });
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

  /**
   * Streamed RAG Chat with event handlers
   */
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
      } catch { }
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
        try {
          const event = JSON.parse(trimmed) as RagStreamEvent;
          handlers.onEvent?.(event);
          if (event.type === "error") throw new ApiError(event.error, 503);
          if (event.type === "done") {
            finalResponse = {
              answer: event.answer,
              sources: event.sources,
              resolved_source: event.resolved_source,
              agent_mode: event.agent_mode,
            };
          }
        } catch (e) {
          console.error("Failed to parse stream event", trimmed, e);
        }
      }
    }
    
    if (!finalResponse) {
        return this.ragChat(question, options);
    }

    return finalResponse;
  };

  // --- Admin ---

  getAdminStats = async (): Promise<AdminStats> => {
    return this.request("/api/admin/stats/");
  };

  getAdminUsers = async (page = 1, limit = 20): Promise<PaginatedUsers> => {
    return this.request(`/api/admin/users?page=${page}&limit=${limit}`);
  };

  updateUserStatus = async (userId: number, status: User["status"]): Promise<User> => {
    return this.request(`/api/admin/users/${userId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  };

  getAdminBills = async (page = 1, limit = 20): Promise<PaginatedBills> => {
    return this.request(`/api/admin/bills?page=${page}&limit=${limit}`);
  };
}

export const api = new ApiClient(API_BASE_URL, AI_BASE_URL);
