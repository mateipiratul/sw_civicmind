import { BaseApiClient } from '../base';
import type { User, AuthKeyResponse } from '../types/auth';

export class AuthModule extends BaseApiClient {
  register = async (username: string, email: string, password: string): Promise<User> => {
    await this.requestTo(this.baseUrl, "/api/auth/csrf/", { method: "GET" });
    const response = await this.request<AuthKeyResponse>("/api/auth/register/", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    localStorage.setItem("auth_token", response.key);
    return this.getProfile();
  };

  login = async (username: string, password: string): Promise<User> => {
    await this.requestTo(this.baseUrl, "/api/auth/csrf/", { method: "GET" });
    const response = await this.request<AuthKeyResponse>("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem("auth_token", response.key);
    return this.getProfile();
  };

  googleLogin = async (accessToken: string): Promise<User> => {
    const response = await this.request<AuthKeyResponse>("/api/auth/google/", {
      method: "POST",
      body: JSON.stringify({ access_token: accessToken }),
    });
    localStorage.setItem("auth_token", response.key);
    return this.getProfile();
  };

  googleLoginWithCode = async (code: string, redirectUri?: string): Promise<User> => {
    // Ensure CSRF cookie is present before performing POST
    await this.requestTo(this.baseUrl, "/api/auth/csrf/", { method: "GET" });
    const body: Record<string, unknown> = { code };
    if (redirectUri) body.redirect_uri = redirectUri;

    const response = await this.request<AuthKeyResponse>("/api/auth/google/", {
      method: "POST",
      body: JSON.stringify(body),
    });
    localStorage.setItem("auth_token", response.key);
    return this.getProfile();
  };

  requestPasswordReset = async (email: string): Promise<void> => {
    await this.requestTo(this.baseUrl, "/api/auth/csrf/", { method: "GET" });
    await this.request("/api/auth/password/reset/", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  };

  confirmPasswordReset = async (data: { uid: string; token: string; new_password?: string; password?: string }): Promise<void> => {
    await this.requestTo(this.baseUrl, "/api/auth/csrf/", { method: "GET" });
    await this.request("/api/auth/password/reset/confirm/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  };

  logout = async (): Promise<void> => {
    localStorage.removeItem("auth_token");
  };

  getProfile = async (): Promise<User> => {
    return this.request("/api/profiles/me/");
  };

  updateProfile = async (data: Partial<User>): Promise<User> => {
    return this.request("/api/profiles/me/", { method: "PATCH", body: JSON.stringify(data) });
  };

  getQuestionnaireMetadata = async (): Promise<{ impact_categories: string[], counties: string[] }> => {
    return this.request("/api/profiles/questionnaire/");
  };

  deleteAccount = async (password: string): Promise<void> => {
    await this.requestTo(this.baseUrl, "/api/auth/csrf/", { method: "GET" });
    await this.request("/api/profiles/me/", { method: "DELETE", body: JSON.stringify({ password }) });
  };
}
