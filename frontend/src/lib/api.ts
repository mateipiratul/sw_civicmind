const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem("auth_token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  private request = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const url = `${this.baseUrl}${endpoint}`;
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
      if (data.errors && Array.isArray(data.errors)) {
        const errorMessage = data.errors.map((e: any) => `${e.field}: ${e.message}`).join(", ");
        throw new ApiError(errorMessage, response.status);
      }
      throw new ApiError(data.detail || data.error || `API Error: ${response.status}`, response.status);
    }

    return data as T;
  };

  // Auth
  register = async (username: string, email: string, password: string): Promise<User> => {
    return this.request("/auth/register", { method: "POST", body: JSON.stringify({ username, email, password }) });
  };
  login = async (email: string, password: string): Promise<User> => {
    return this.request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  };

  // Bills
  listBills = async (status?: string, page = 1, limit = 20): Promise<PaginatedBills> => {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) q.append("status", status);
    return this.request(`/api/bills?${q}`);
  };

  getBill = async (id: number): Promise<Bill> => {
    return this.request(`/api/bills/${id}`);
  };

  // User
  getProfile = async (): Promise<User> => { return this.request("/api/profiles/me/"); };
  updateProfile = async (data: Partial<User>): Promise<User> => {
    return this.request("/api/profiles/me/", { method: "PATCH", body: JSON.stringify(data) });
  };
  
  logout = async (): Promise<void> => { localStorage.removeItem("auth_token"); };

  // Admin
  getAdminStats = async (): Promise<AdminStats> => { return this.request("/api/admin/stats"); };
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

export const api = new ApiClient(API_BASE_URL);
