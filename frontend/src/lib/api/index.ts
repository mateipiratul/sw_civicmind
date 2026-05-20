import { API_BASE_URL, AI_BASE_URL } from './config';
import { AuthModule } from './modules/auth';
import { BillsModule } from './modules/bills';
import { MPsModule } from './modules/mps';
import { AIModule } from './modules/ai';
import { AdminModule } from './modules/admin';

class ApiClient {
  auth: AuthModule;
  bills: BillsModule;
  mps: MPsModule;
  ai: AIModule;
  admin: AdminModule;

  constructor(baseUrl: string, aiBaseUrl: string) {
    this.auth = new AuthModule(baseUrl, aiBaseUrl);
    this.bills = new BillsModule(baseUrl, aiBaseUrl);
    this.mps = new MPsModule(baseUrl, aiBaseUrl);
    this.ai = new AIModule(baseUrl, aiBaseUrl);
    this.admin = new AdminModule(baseUrl, aiBaseUrl);
  }

  // --- Re-exporting methods for backward compatibility ---
  // Note: These just delegate to the modules to ensure zero breaking changes.

  // Auth
  register = this.auth.register;
  login = this.auth.login;
  googleLogin = this.auth.googleLogin;
  googleLoginWithCode = this.auth.googleLoginWithCode;
  requestPasswordReset = this.auth.requestPasswordReset;
  confirmPasswordReset = this.auth.confirmPasswordReset;
  logout = this.auth.logout;
  getProfile = this.auth.getProfile;
  updateProfile = this.auth.updateProfile;
  getQuestionnaireMetadata = this.auth.getQuestionnaireMetadata;
  deleteAccount = this.auth.deleteAccount;

  // Bills
  listBills = this.bills.listBills;
  getBill = this.bills.getBill;
  getBillVotes = this.bills.getBillVotes;
  getMetadata = this.bills.getMetadata;
  getTrendingTopics = this.bills.getTrendingTopics;
  getPersonalizedFeed = this.bills.getPersonalizedFeed;
  searchGlobal = this.bills.searchGlobal;

  // MPs
  listMPs = this.mps.listMPs;
  getMP = this.mps.getMP;
  getMPDetail = this.mps.getMPDetail;
  getMPMetadata = this.mps.getMPMetadata;
  getMyRepresentatives = this.mps.getMyRepresentatives;

  // AI
  analyzeOnboardingProfile = this.ai.analyzeOnboardingProfile;
  ragChat = this.ai.ragChat;
  streamRagChat = this.ai.streamRagChat;

  // Admin
  getAdminStats = this.admin.getAdminStats;
  getAdminUsers = this.admin.getAdminUsers;
  updateUserStatus = this.admin.updateUserStatus;
  getAdminBills = this.admin.getAdminBills;
}

export const api = new ApiClient(API_BASE_URL, AI_BASE_URL);

// Re-export types
export * from './types/bills';
export * from './types/mps';
export * from './types/auth';
export * from './types/rag';
export * from './types/common';
export { ApiError } from './base';
