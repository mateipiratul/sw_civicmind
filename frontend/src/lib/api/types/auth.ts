import type { PaginatedResponse } from './common';

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
  avatar_url?: string | null;
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

export interface QuestionnaireOption {
  value: string;
  label: string;
}

export interface QuestionnaireMetadata {
  impact_categories: string[];
  impact_category_options: QuestionnaireOption[];
  counties: string[];
  affected_profiles?: string[];
  county_label?: string;
  party_label?: string;
  party_options?: QuestionnaireOption[];
  work_domains?: QuestionnaireOption[];
  employment_statuses?: QuestionnaireOption[];
  personal_interest_areas?: QuestionnaireOption[];
  age_ranges?: QuestionnaireOption[];
  housing_statuses?: QuestionnaireOption[];
  mobility_modes?: QuestionnaireOption[];
  education_contexts?: QuestionnaireOption[];
  energy_focus_options?: QuestionnaireOption[];
  public_service_options?: QuestionnaireOption[];
}
