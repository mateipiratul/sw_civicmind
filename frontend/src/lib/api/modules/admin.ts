import { BaseApiClient } from '../base';
import type { User, PaginatedUsers } from '../types/auth';
import type { AdminStats } from '../types/common';
import type { PaginatedBills } from '../types/bills';

export class AdminModule extends BaseApiClient {
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
