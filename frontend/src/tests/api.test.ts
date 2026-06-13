/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/lib/api";
import { db } from "./mocks/db";

// Mock fetch globally across all possible global scopes in JSDOM
const fetchMock = vi.fn();
global.fetch = fetchMock;
globalThis.fetch = fetchMock;
if (typeof window !== "undefined") {
  window.fetch = fetchMock;
}

// Helper to mock JSON response with content-type header
const mockJsonResponse = (data: any, ok = true) => ({
  ok,
  status: ok ? 200 : 400,
  headers: {
    get: (name: string) => name.toLowerCase() === "content-type" ? "application/json" : null
  },
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data))
});

describe("API client", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    localStorage.clear();
    db.reset();
  });

  describe("register", () => {
    it("should register a user successfully", async () => {
      // Mock CSRF and register endpoints. Profile GET is handled by MSW.
      fetchMock
        .mockResolvedValueOnce(mockJsonResponse({}))
        .mockResolvedValueOnce(mockJsonResponse({ key: "mock-token" }));

      const result = await api.register("testuser", "test@example.com", "password");

      // Only CSRF and register should call fetchMock (since Profile GET is intercepted by MSW)
      expect(fetchMock).toHaveBeenCalledTimes(2);
      
      // Check csrf call
      const csrfReq = fetchMock.mock.calls[0][0];
      expect(csrfReq.url).toBe("http://localhost:4001/api/auth/csrf/");
      expect(csrfReq.method).toBe("GET");

      // Check register call
      const regReq = fetchMock.mock.calls[1][0];
      expect(regReq.url).toBe("http://localhost:4001/api/auth/register/");
      expect(regReq.method).toBe("POST");
      expect(await regReq.json()).toEqual({
        username: "testuser",
        email: "test@example.com",
        password1: "password",
        password2: "password",
      });

      // The returned result should be the profile from MSW / db.ts
      expect(result).toEqual(db.getUser());
    });

    it("should throw error on registration failure", async () => {
      // Mock sequence: csrf, register fails
      fetchMock
        .mockResolvedValueOnce(mockJsonResponse({}))
        .mockResolvedValueOnce(mockJsonResponse({ error: "User already exists" }, false));

      await expect(api.register("testuser", "test@example.com", "password"))
        .rejects.toThrow("User already exists");
    });
  });

  describe("login", () => {
    it("should login successfully", async () => {
      // Mock CSRF and login endpoints. Profile GET is handled by MSW.
      fetchMock
        .mockResolvedValueOnce(mockJsonResponse({}))
        .mockResolvedValueOnce(mockJsonResponse({ key: "mock-token" }));

      const result = await api.login("testuser", "password");

      // Only CSRF and login should call fetchMock (since Profile GET is intercepted by MSW)
      expect(fetchMock).toHaveBeenCalledTimes(2);

      const csrfReq = fetchMock.mock.calls[0][0];
      expect(csrfReq.url).toBe("http://localhost:4001/api/auth/csrf/");

      const loginReq = fetchMock.mock.calls[1][0];
      expect(loginReq.url).toBe("http://localhost:4001/api/auth/login/");
      expect(loginReq.method).toBe("POST");
      expect(await loginReq.json()).toEqual({ username: "testuser", password: "password" });

      expect(result).toEqual(db.getUser());
    });
  });

  describe("getQuestionnaireMetadata", () => {
    it("should normalize questionnaire options for onboarding", async () => {
      const { server } = await import("./setup");
      const { http, HttpResponse } = await import("msw");

      server.use(
        http.get("http://localhost:4001/api/profiles/questionnaire/", () => {
          return HttpResponse.json({
            personal_interest_areas: [
              { value: "health", label: "Sanatate" },
              { value: "education", label: "Educatie" },
            ],
          });
        })
      );

      const result = await api.getQuestionnaireMetadata();

      expect(result.impact_categories).toEqual(["Sanatate", "Educatie"]);
      expect(result.impact_category_options).toEqual([
        { value: "health", label: "Sanatate" },
        { value: "education", label: "Educatie" },
      ]);
      expect(result.counties).toContain("Cluj");
    });
  });

  describe("listBills", () => {
    it("should fetch bills successfully", async () => {
      const mockBillsResponse = {
        results: [{ id: 1, title: "Test Bill" }],
        count: 1,
        next: null,
        previous: null
      };
      fetchMock.mockResolvedValueOnce(mockJsonResponse(mockBillsResponse));

      const result = await api.listBills();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const req = fetchMock.mock.calls[0][0];
      expect(req.url).toBe("http://localhost:4001/api/bills/?page=1&limit=20");
      expect(req.headers.get("Content-Type")).toBe("application/json");
      expect(result).toEqual(mockBillsResponse);
    });

    it("should include auth header when token exists", async () => {
      localStorage.setItem("auth_token", "test-token");
      fetchMock.mockResolvedValueOnce(mockJsonResponse({ results: [], count: 0 }));

      await api.listBills();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const req = fetchMock.mock.calls[0][0];
      expect(req.url).toBe("http://localhost:4001/api/bills/?page=1&limit=20");
      expect(req.headers.get("Authorization")).toBe("Token test-token");
    });
  });
});
