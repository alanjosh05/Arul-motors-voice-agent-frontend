"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { clearSession, getStoredUser, getToken, saveSession } from "@/lib/session";
import type { StaffUser } from "@/lib/types";

interface AuthContextValue {
  user: StaffUser | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Read the stored session after mount (localStorage isn't available during the static build).
    setUser(getToken() ? getStoredUser() : null);
    setReady(true);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await api<{ token: string; user: StaffUser }>("/api/auth/login", {
      method: "POST",
      body: { username, password },
    });
    saveSession(result.token, result.user);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    window.location.href = "/login/";
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
