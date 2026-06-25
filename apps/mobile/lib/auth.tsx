"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ensureDemoUser,
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  signup as apiSignup,
  updateUserPlan as apiUpdatePlan,
  type AccountUser,
  type Plan,
} from "./api";

type AuthContextValue = {
  user: AccountUser | null;
  isAuthenticated: boolean;
  plan: Plan;
  hasPaid: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  setPlan: (plan: Plan) => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setUser(await getCurrentUser());
  }, []);

  useEffect(() => {
    (async () => {
      await ensureDemoUser();
      await refresh();
      setIsLoading(false);
    })();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const u = await apiLogin({ email, password });
      setUser(u);
    },
    []
  );

  const signup = useCallback(
    async (email: string, password: string, displayName: string) => {
      const u = await apiSignup({ email, password, displayName });
      setUser(u);
    },
    []
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const setPlan = useCallback(async (next: Plan) => {
    const updated = await apiUpdatePlan(next);
    if (updated) setUser(updated);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      plan: user?.plan ?? "free",
      hasPaid: user?.plan === "pro" || user?.plan === "master",
      isLoading,
      login,
      signup,
      logout,
      setPlan,
      refresh,
    }),
    [user, isLoading, login, signup, logout, setPlan, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function toErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return (err as { message: string }).message;
  }
  return "未知错误，请稍后再试";
}
