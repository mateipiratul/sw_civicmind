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

  // --- Delegated Methods for Backward Compatibility ---
  // We declare them here so they are part of the class type, 
  // but we initialize them in the constructor.

  register: AuthModule['register'];
  login: AuthModule['login'];
  googleLogin: AuthModule['googleLogin'];
  googleLoginWithCode: AuthModule['googleLoginWithCode'];
  requestPasswordReset: AuthModule['requestPasswordReset'];
  confirmPasswordReset: AuthModule['confirmPasswordReset'];
  logout: AuthModule['logout'];
  getProfile: AuthModule['getProfile'];
  updateProfile: AuthModule['updateProfile'];
  getQuestionnaireMetadata: AuthModule['getQuestionnaireMetadata'];
  deleteAccount: AuthModule['deleteAccount'];

  listBills: BillsModule['listBills'];
  getBill: BillsModule['getBill'];
  getBillVotes: BillsModule['getBillVotes'];
  getMetadata: BillsModule['getMetadata'];
  getTrendingTopics: BillsModule['getTrendingTopics'];
  getPersonalizedFeed: BillsModule['getPersonalizedFeed'];
  searchGlobal: BillsModule['searchGlobal'];

  listMPs: MPsModule['listMPs'];
  getMP: MPsModule['getMP'];
  getMPDetail: MPsModule['getMPDetail'];
  getMPMetadata: MPsModule['getMPMetadata'];
  getMyRepresentatives: MPsModule['getMyRepresentatives'];

  analyzeOnboardingProfile: AIModule['analyzeOnboardingProfile'];
  ragChat: AIModule['ragChat'];
  streamRagChat: AIModule['streamRagChat'];

  getAdminStats: AdminModule['getAdminStats'];
  getAdminUsers: AdminModule['getAdminUsers'];
  updateUserStatus: AdminModule['updateUserStatus'];
  getAdminBills: AdminModule['getAdminBills'];

  constructor(baseUrl: string, aiBaseUrl: string) {
    this.auth = new AuthModule(baseUrl, aiBaseUrl);
    this.bills = new BillsModule(baseUrl, aiBaseUrl);
    this.mps = new MPsModule(baseUrl, aiBaseUrl);
    this.ai = new AIModule(baseUrl, aiBaseUrl);
    this.admin = new AdminModule(baseUrl, aiBaseUrl);

    // Initialize delegations AFTER modules are created
    this.register = this.auth.register;
    this.login = this.auth.login;
    this.googleLogin = this.auth.googleLogin;
    this.googleLoginWithCode = this.auth.googleLoginWithCode;
    this.requestPasswordReset = this.auth.requestPasswordReset;
    this.confirmPasswordReset = this.auth.confirmPasswordReset;
    this.logout = this.auth.logout;
    this.getProfile = this.auth.getProfile;
    this.updateProfile = this.auth.updateProfile;
    this.getQuestionnaireMetadata = this.auth.getQuestionnaireMetadata;
    this.deleteAccount = this.auth.deleteAccount;

    this.listBills = this.bills.listBills;
    this.getBill = this.bills.getBill;
    this.getBillVotes = this.bills.getBillVotes;
    this.getMetadata = this.bills.getMetadata;
    this.getTrendingTopics = this.bills.getTrendingTopics;
    this.getPersonalizedFeed = this.bills.getPersonalizedFeed;
    this.searchGlobal = this.bills.searchGlobal;

    this.listMPs = this.mps.listMPs;
    this.getMP = this.mps.getMP;
    this.getMPDetail = this.mps.getMPDetail;
    this.getMPMetadata = this.mps.getMPMetadata;
    this.getMyRepresentatives = this.mps.getMyRepresentatives;

    this.analyzeOnboardingProfile = this.ai.analyzeOnboardingProfile;
    this.ragChat = this.ai.ragChat;
    this.streamRagChat = this.ai.streamRagChat;

    this.getAdminStats = this.admin.getAdminStats;
    this.getAdminUsers = this.admin.getAdminUsers;
    this.updateUserStatus = this.admin.updateUserStatus;
    this.getAdminBills = this.admin.getAdminBills;
  }
}

export const api = new ApiClient(API_BASE_URL, AI_BASE_URL);

// Re-export types
export * from './types/bills';
export * from './types/mps';
export * from './types/auth';
export * from './types/rag';
export * from './types/common';
export { ApiError } from './base';
