import { useEffect, useState, useMemo, useCallback } from "react";
import { api } from "./api";
import type { User } from "./api";
import { AuthContext } from "./auth-context-core";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const token = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("auth_user");
    if (token && userData) {
      try {
        return { ...JSON.parse(userData), token };
      } catch {
        return null;
      }
    }
    return null;
  });
  
  // check storage synchronously in useState initializer 
  const [isLoading] = useState(false);

  const logout = useCallback(() => {
    console.log("[AuthContext] Logging out, clearing storage.");
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      console.log("[AuthContext] Fetching latest profile...");
      const profile = await api.getProfile();
      setUser(prev => {
        if (!prev) return null;
        const updated = { ...prev, ...profile };
        const { token, ...userData } = updated;
        localStorage.setItem("auth_user", JSON.stringify(userData));
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

  useEffect(() => {
    if (user) {
      api.getProfile().then(profile => {
        setUser(prev => {
          if (!prev) return null;
          const updated = { ...prev, ...profile };
          const { token, ...userData } = updated;
          localStorage.setItem("auth_user", JSON.stringify(userData));
          return updated;
        });
      }).catch(err => {
        if (err instanceof Error && err.message.includes("401")) {
           console.warn("[AuthContext] BG Refresh 401");
           logout();
        }
      });
    }
  }, [logout]);

  const login = useCallback((newUser: User) => {
    console.log("[AuthContext] Login logic...");
    if (newUser.token) {
      localStorage.setItem("auth_token", newUser.token);
    }
    const { token, ...userData } = newUser;
    localStorage.setItem("auth_user", JSON.stringify(userData));
    setUser(newUser);
    fetchProfile();
  }, [fetchProfile]);

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
