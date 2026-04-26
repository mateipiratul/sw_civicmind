import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
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

  // 1. Stable logout reference
  const logout = useCallback(() => {
    console.log("[AuthContext] Logging out, clearing storage.");
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  }, []);

  // 2. Stable profile fetch reference
  const fetchProfile = useCallback(async () => {
    try {
      console.log("[AuthContext] Fetching latest profile...");
      const profile = await api.getProfile();
      setUser(prev => {
        if (!prev) return null;
        const updated = { ...prev, ...profile };
        localStorage.setItem("auth_user", JSON.stringify(profile));
        return updated;
      });
      console.log("[AuthContext] Profile refreshed.");
    } catch (error) {
      console.error("[AuthContext] Failed to fetch user profile:", error);
      if (error instanceof Error && error.message.includes("401")) {
        console.warn("[AuthContext] 401 detected in refresh, logging out.");
        logout();
      }
    }
  }, [logout]);

  // 3. Initial load effect
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("auth_user");

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        console.log("[AuthContext] Restoring session:", parsedUser.username);
        setUser({ ...parsedUser, token });
        
        // BG Refresh
        api.getProfile().then(profile => {
          setUser(prev => prev ? { ...prev, ...profile } : null);
          localStorage.setItem("auth_user", JSON.stringify(profile));
        }).catch(err => {
          if (err instanceof Error && err.message.includes("401")) {
             console.warn("[AuthContext] BG Refresh 401");
             logout();
          }
        });
      } catch (e) {
        console.error("[AuthContext] Corrupt storage");
        logout();
      }
    }

    setIsLoading(false);
  }, [logout]); // logout is stable, so this is safe

  const login = useCallback((newUser: User) => {
    console.log("[AuthContext] Login logic...");
    if (newUser.token) {
      localStorage.setItem("auth_token", newUser.token);
    }
    const { token, ...userData } = newUser;
    localStorage.setItem("auth_user", JSON.stringify(userData));
    setUser(newUser);
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updatedUser = { ...prev, ...data };
      const { token, ...userData } = updatedUser;
      localStorage.setItem("auth_user", JSON.stringify(userData));
      return updatedUser;
    });
  }, []);

  const contextValue = useMemo(() => ({
    user,
    isLoading,
    login,
    logout,
    refreshUser,
    updateUser,
    isAuthenticated: !!user && !!user.username,
  }), [user, isLoading, login, logout, refreshUser, updateUser]);

  return (
    <AuthContext.Provider value={contextValue}>
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
