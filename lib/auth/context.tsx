import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getToken, getUserId, setCredentials, clearCredentials, setOnUnauthorized } from "@/lib/api/client";
import * as authApi from "@/lib/api/auth";
import type { LoginRequest } from "@/lib/types/auth";

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const handleUnauthorized = useCallback(() => {
    setIsAuthenticated(false);
    setUserId(null);
  }, []);

  useEffect(() => {
    setOnUnauthorized(handleUnauthorized);
  }, [handleUnauthorized]);

  useEffect(() => {
    (async () => {
      const [token, uid] = await Promise.all([getToken(), getUserId()]);
      if (token && uid) {
        setIsAuthenticated(true);
        setUserId(uid);
      }
      setIsLoading(false);
    })();
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    const res = await authApi.login(data);
    await setCredentials(res.token, res.user_id);
    setUserId(res.user_id);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    await clearCredentials();
    setIsAuthenticated(false);
    setUserId(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated, userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
