/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Route as BillDetailRoute } from "../routes/bills/$id";
import { Route as DashboardRoute } from "../routes/index";
import { api } from "@/lib/api";

// Mock dependencies locally
vi.mock("@/lib/api", () => ({
  api: {
    getBill: vi.fn(),
    getBillVotes: vi.fn(),
    listBills: vi.fn(),
    listMPs: vi.fn(),
    getPersonalizedFeed: vi.fn(),
    getTrendingTopics: vi.fn(),
  },
}));

vi.mock("@/lib/use-auth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { id: 1, role: "user", username: "test", county: "Cluj" },
    refreshUser: vi.fn(),
  }),
}));

// Mock tanstack router locally
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (fn: (props: unknown) => React.ReactNode) => fn,
  useParams: () => ({ id: "999" }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

describe("Error States", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation to avoid TypeError inside queries
    (api.listMPs as Mock).mockResolvedValue({ parliamentarians: [] });
  });

  it("should show 'Legislație negăsită' when API returns 404", async () => {
    (api.getBill as Mock).mockRejectedValue(new Error("Bill not found"));
    
    const BillDetailPage = (BillDetailRoute as unknown as { component: React.ComponentType }).component;
    render(<BillDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/legislație negăsită/i)).toBeInTheDocument();
      expect(screen.getByText(/bill not found/i)).toBeInTheDocument();
    });
  });

  it("should show error message on dashboard when listBills fails", async () => {
    (api.listBills as Mock).mockRejectedValue(new Error("Network Error"));
    (api.getPersonalizedFeed as Mock).mockRejectedValue(new Error("Network Error"));
    
    const DashboardPage = (DashboardRoute as unknown as { component: React.ComponentType }).component;
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });
});
