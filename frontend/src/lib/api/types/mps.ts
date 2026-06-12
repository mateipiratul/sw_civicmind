import type { PaginatedResponse } from './common';
import type { Bill } from './bills';

export interface ImpactScore {
  score: number;
  total_votes: number;
  for_count: number;
  against_count: number;
  abstain_count: number;
  absent_count: number;
  categories_voted: string[];
  narrative: string;
  calculated_at: string | null;
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

export interface PaginatedMPList extends PaginatedResponse {
  parliamentarians: Parliamentarian[];
  filters?: { county?: string; party?: string | null; chamber?: string };
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
