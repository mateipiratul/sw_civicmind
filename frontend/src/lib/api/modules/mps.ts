import { BaseApiClient } from '../base';
import type { 
  Parliamentarian, 
  PaginatedMPList, 
  ParliamentarianDetail, 
  MPMetadata 
} from '../types/mps';

export class MPsModule extends BaseApiClient {
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
}
