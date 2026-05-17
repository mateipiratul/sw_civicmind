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
  
  // Since we check storage synchronously in useState initializer, 
  // we're not "loading" the initial state anymore.
  const [isLoading] = useState(false);

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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // 3. BG Refresh effect
  useEffect(() => {
    if (user) {
      // BG Refresh
      api.getProfile().then(profile => {
        setUser(prev => {
          if (!prev) return null;
          const updated = { ...prev, ...profile };
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  }, [logout]); // logout is stable, user is handled inside effect but not in deps to avoid loops

  const login = useCallback((newUser: User) => {
    console.log("[AuthContext] Login logic...");
    if (newUser.token) {
      localStorage.setItem("auth_token", newUser.token);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
