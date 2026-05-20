export interface PaginatedResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TrendingTopic {
  label: string;
  count: number;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalBills: number;
  activeBills: number;
  analyzedBills: number;
}
