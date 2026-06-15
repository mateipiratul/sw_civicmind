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
  const username = user?.username;

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const profile = await api.getProfile();
      setUser(prev => {
        if (!prev) return null;
        const updated = { ...prev, ...profile };
        localStorage.setItem("auth_user", JSON.stringify(toStoredUser(updated)));
        return updated;
      });
    } catch (error) {
      console.error("[AuthContext] Failed to fetch user profile:", error);
      if (error instanceof Error && error.message.includes("401")) {
        logout();
      }
    }
  }, [logout]);

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [fetchProfile, username]);

  const login = useCallback((newUser: User) => {
    if (newUser.token) {
      localStorage.setItem("auth_token", newUser.token);
    }
    localStorage.setItem("auth_user", JSON.stringify(toStoredUser(newUser)));
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
      localStorage.setItem("auth_user", JSON.stringify(toStoredUser(updatedUser)));
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

function toStoredUser(user: User) {
  const storedUser = { ...user };
  delete storedUser.token;
  return storedUser;
}
