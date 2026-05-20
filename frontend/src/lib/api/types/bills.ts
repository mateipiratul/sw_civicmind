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
  
  doc_expunere_url: string | null;
  doc_forma_url: string | null;
  doc_aviz_ces_url: string | null;
  doc_aviz_cl_url: string | null;
  doc_adoptata_url: string | null;
  
  ocr_expunere?: string | null;
  ocr_aviz_ces?: string | null;
  ocr_aviz_cl?: string | null;

  ai_analysis?: AIAnalysis | null;
}

export interface PartyVoteResult {
  party: string;
  for: number;
  against: number;
  abstain: number;
  absent: number;
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
  by_party: PartyVoteResult[];
}

export interface PaginatedBills extends PaginatedResponse {
  bills: Bill[];
}

import { PaginatedResponse } from './common';
