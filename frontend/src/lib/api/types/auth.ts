import { PaginatedResponse } from './common';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: "guest" | "user" | "admin" | "staff";
  
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

export interface PaginatedUsers extends PaginatedResponse {
  users: User[];
}

export interface AuthKeyResponse {
  key: string;
}
