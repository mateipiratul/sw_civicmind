/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Route as AdminStatsRoute } from "../routes/admin/stats";
import { Route as AdminUsersRoute } from "../routes/admin/users";
import { api, AdminStats, PaginatedUsers } from "@/lib/api";

// Mock api
vi.mock("@/lib/api", () => ({
  api: {
    getAdminStats: vi.fn(),
    getAdminUsers: vi.fn(),
    updateUserStatus: vi.fn(),
    getAdminMarkets: vi.fn(),
  },
}));

// Mock tanstack router locally
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (fn: (props: unknown) => React.ReactNode) => fn,
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: "1" }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

describe("Admin Pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Admin Stats Page", () => {
    const mockStats = {
      totalUsers: 100,
      activeUsers: 80,
      totalBills: 20,
      activeBills: 15,
      analyzedBills: 50,
    };

    it("should render admin metrics", async () => {
      (api.getAdminStats as Mock).mockResolvedValue(mockStats);
      const AdminStatsPage = (AdminStatsRoute as unknown as { component: React.ComponentType }).component;
      render(<AdminStatsPage />);

      await waitFor(() => {
        expect(screen.getByText("100")).toBeInTheDocument(); // totalUsers
        expect(screen.getByText("20")).toBeInTheDocument(); // totalBills
        expect(screen.getByText("50%")).toBeInTheDocument(); // analyzedBills percentage
      });
    });
  });

  describe("Admin Users Page", () => {
    const mockUsersResponse: PaginatedUsers = {
      users: [
        { id: 1, username: "user1", email: "u1@test.com", role: "user", status: "active", balance: 100, totalWinnings: 0, createdAt: "" },
        { id: 2, username: "user2", email: "u2@test.com", role: "user", status: "suspended", balance: 200, totalWinnings: 0, createdAt: "" },
      ],
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    };

    it("should render list of users", async () => {
      (api.getAdminUsers as Mock).mockResolvedValue(mockUsersResponse);
      const AdminUsersPage = (AdminUsersRoute as unknown as { component: React.ComponentType }).component;
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText("user1")).toBeInTheDocument();
        expect(screen.getByText("user2")).toBeInTheDocument();
        expect(screen.getByText("active")).toBeInTheDocument();
        expect(screen.getByText("suspended")).toBeInTheDocument();
      });
    });

    it("should render User Management header", async () => {
      (api.getAdminUsers as Mock).mockResolvedValue(mockUsersResponse);
      const AdminUsersPage = (AdminUsersRoute as unknown as { component: React.ComponentType }).component;
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText("User Management")).toBeInTheDocument();
      });
    });
  });
});
