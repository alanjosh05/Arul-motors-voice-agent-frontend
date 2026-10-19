"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";
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

const noSubscribe = () => () => {};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // False during the static build and hydration, true in the browser after
  // (localStorage isn't available during the build).
  const ready = useSyncExternalStore(noSubscribe, () => true, () => false);
  const stored = useMemo(() => (ready && getToken() ? getStoredUser() : null), [ready]);
  // Set by login/logout; until then the stored session applies.
  const [session, setSession] = useState<{ user: StaffUser | null } | null>(null);
  const user = session ? session.user : stored;

  const login = useCallback(async (username: string, password: string) => {
    const result = await api<{ token: string; user: StaffUser }>("/api/auth/login", {
      method: "POST",
      body: { username, password },
    });
    saveSession(result.token, result.user);
    setSession({ user: result.user });
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession({ user: null });
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
