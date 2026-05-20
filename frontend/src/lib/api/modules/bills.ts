import { BaseApiClient } from '../base';
import { Bill, PaginatedBills } from '../types/bills';
import { BillVotesResponse, GlobalSearchResponse } from '../types/mps';
import { TrendingTopic } from '../types/common';

export class BillsModule extends BaseApiClient {
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

  searchGlobal = async (query: string): Promise<GlobalSearchResponse> => {
    const q = new URLSearchParams({ q: query });
    return this.request(`/api/search/?${q}`);
  };
}
