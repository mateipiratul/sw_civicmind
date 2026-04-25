import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";
import type { User } from "./api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const profile = await api.getProfile();
      setUser(prev => {
        if (!prev) return null;
        const updated = { ...prev, ...profile };
        localStorage.setItem("auth_user", JSON.stringify(profile));
        return updated;
      });
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      // Only logout if it's a 401
      if (error instanceof Error && error.message.includes("401")) {
        logout();
      }
    }
  };

  useEffect(() => {
    // Load user from localStorage on mount
    const token = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("auth_user");

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser({ ...parsedUser, token });
        // Refresh profile in background to get latest balance/data
        api.getProfile().then(profile => {
          setUser(prev => prev ? { ...prev, ...profile } : null);
          localStorage.setItem("auth_user", JSON.stringify(profile));
        }).catch(err => {
          console.error("BG Refresh failed", err);
          if (err instanceof Error && err.message.includes("401")) logout();
        });
      } catch {
        logout();
      }
    }

    setIsLoading(false);
  }, []);

  const login = (newUser: User) => {
    // Ensure we have a clean state update
    setUser(newUser);
    if (newUser.token) {
      localStorage.setItem("auth_token", newUser.token);
    }
    const { token, ...userData } = newUser;
    localStorage.setItem("auth_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  };

  const refreshUser = async () => {
    await fetchProfile();
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      const { token, ...userData } = updatedUser;
      localStorage.setItem("auth_user", JSON.stringify(userData));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        refreshUser,
        updateUser,
        isAuthenticated: !!user && !!user.username,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
