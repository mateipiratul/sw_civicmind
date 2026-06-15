import { BaseApiClient } from '../base';
import type { User, AuthKeyResponse, QuestionnaireMetadata, QuestionnaireOption } from '../types/auth';

const ROMANIAN_COUNTIES = [
  "Alba",
  "Arad",
  "Arges",
  "Bacau",
  "Bihor",
  "Bistrita-Nasaud",
  "Botosani",
  "Brasov",
  "Braila",
  "Bucuresti",
  "Buzau",
  "Caras-Severin",
  "Calarasi",
  "Cluj",
  "Constanta",
  "Covasna",
  "Dambovita",
  "Dolj",
  "Galati",
  "Giurgiu",
  "Gorj",
  "Harghita",
  "Hunedoara",
  "Ialomita",
  "Iasi",
  "Ilfov",
  "Maramures",
  "Mehedinti",
  "Mures",
  "Neamt",
  "Olt",
  "Prahova",
  "Satu Mare",
  "Salaj",
  "Sibiu",
  "Suceava",
  "Teleorman",
  "Timis",
  "Tulcea",
  "Vaslui",
  "Valcea",
  "Vrancea",
  "Diaspora",
];

const optionLabels = (options: QuestionnaireOption[] | string[] | undefined): string[] => {
  if (!Array.isArray(options)) return [];
  return options
    .map((option) => (typeof option === "string" ? option : option.label || option.value))
    .filter((label): label is string => Boolean(label));
};

const optionList = (options: QuestionnaireOption[] | string[] | undefined): QuestionnaireOption[] => {
  if (!Array.isArray(options)) return [];
  return options
    .map((option) => (typeof option === "string" ? { value: option, label: option } : option))
    .filter((option) => Boolean(option.value && option.label));
};

export class AuthModule extends BaseApiClient {
  register = async (username: string, email: string, password: string): Promise<User> => {
    await this.requestTo(this.baseUrl, "/api/auth/csrf/", { method: "GET" });
    const response = await this.request<AuthKeyResponse>("/api/auth/register/", {
      method: "POST",
      body: JSON.stringify({ username, email, password1: password, password2: password }),
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

  getQuestionnaireMetadata = async (): Promise<QuestionnaireMetadata> => {
    const metadata = await this.request<QuestionnaireMetadata>("/api/profiles/questionnaire/");
    const interestOptions = optionList(
      metadata.personal_interest_areas?.length ? metadata.personal_interest_areas : metadata.impact_categories
    );

    return {
      ...metadata,
      impact_category_options: interestOptions,
      impact_categories: optionLabels(interestOptions),
      counties: metadata.counties?.length ? metadata.counties : ROMANIAN_COUNTIES,
    };
  };

  deleteAccount = async (password: string): Promise<void> => {
    await this.requestTo(this.baseUrl, "/api/auth/csrf/", { method: "GET" });
    await this.request("/api/profiles/me/", { method: "DELETE", body: JSON.stringify({ password }) });
  };
}
