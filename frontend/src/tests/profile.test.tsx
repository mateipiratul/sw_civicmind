/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Route as ProfileRoute } from "../routes/profile/index";
import { useAuth } from "@/lib/use-auth";

// Mock useAuth locally
vi.mock("@/lib/use-auth", () => ({
  useAuth: vi.fn(),
}));

// Mock tanstack router locally
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (fn: (props: unknown) => React.ReactNode) => fn,
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: "1" }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

describe("Profile Page", () => {
  const mockUser = {
    id: 1,
    username: "testuser",
    email: "test@example.com",
    role: "user",
    status: "active",
    balance: 1000,
    totalWinnings: 500,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as Mock).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      updateUser: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  it("should render user profile information", async () => {
    const ProfilePage = (ProfileRoute as unknown as { component: React.ComponentType }).component;
    render(<ProfilePage />);

    // Wait for loading to finish and content to appear
    await waitFor(() => {
      expect(screen.queryByRole("status") || screen.queryByText(/loading/i)).not.toBeInTheDocument();
      expect(screen.getByDisplayValue("testuser")).toBeInTheDocument();
    }, { timeout: 2000 });

    expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
  });

  it("should handle profile update", async () => {
    const updateUserMock = vi.fn();
    (useAuth as Mock).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      updateUser: updateUserMock,
    });

    const ProfilePage = (ProfileRoute as unknown as { component: React.ComponentType }).component;
    render(<ProfilePage />);

    const usernameInput = screen.getByDisplayValue("testuser");
    fireEvent.change(usernameInput, { target: { value: "newusername" } });

    const saveButton = screen.getByText(/salvează modificările/i);
    fireEvent.click(saveButton);

    // In ProfileForm, clicking Save changes the updateStep to "confirm". We need to click "Da, salvează" inside the modal.
    const confirmButton = await screen.findByText(/da, salvează/i);
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/profil actualizat/i)).toBeInTheDocument();
      expect(updateUserMock).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "newusername",
          email: "test@example.com",
        })
      );
    });
  });

  it("should show error on update failure", async () => {
    const { server } = await import("./setup");
    const { http, HttpResponse } = await import("msw");

    // Dynamically override MSW handler to return an error status
    server.use(
      http.patch("http://localhost:4001/api/profiles/me/", () => {
        return new HttpResponse(null, { status: 400 });
      })
    );

    const ProfilePage = (ProfileRoute as unknown as { component: React.ComponentType }).component;
    render(<ProfilePage />);

    const saveButton = screen.getByText(/salvează modificările/i);
    fireEvent.click(saveButton);

    // In ProfileForm, clicking Save changes the updateStep to "confirm". We need to click "Da, salvează" inside the modal.
    const confirmButton = await screen.findByText(/da, salvează/i);
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });
  });

  it("should show Admin Panel button only for admins", () => {
    const ProfilePage = (ProfileRoute as unknown as { component: React.ComponentType }).component;
    
    // Case 1: User is admin
    (useAuth as Mock).mockReturnValue({
      user: { ...mockUser, role: "admin" },
      isAuthenticated: true,
      isLoading: false,
    });
    const { rerender } = render(<ProfilePage />);
    expect(screen.getByText(/admin panel/i)).toBeInTheDocument();

    // Case 2: User is regular user
    (useAuth as Mock).mockReturnValue({
      user: { ...mockUser, role: "user" },
      isAuthenticated: true,
      isLoading: false,
    });
    rerender(<ProfilePage />);
    expect(screen.queryByText(/admin panel/i)).not.toBeInTheDocument();
  });
});
