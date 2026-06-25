"use client";

/**
 * AuthContext — 全局登录态 + 套餐
 *
 * 设计:
 * - 从 localStorage 读 session（仅客户端）
 * - 提供 login/logout/signup/refresh
 * - 暴露 user / plan / hasPaid
 * - SSR 期间返回安全默认值（user=null, isLoading=true），水合后立即修正
 * - 整个 web app 通过 useAuth() 消费
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AccountUser, Plan } from "@ntgm/sdk";
import {
  ensureDemoUser,
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  signup as apiSignup,
  updateUserPlan as apiUpdatePlan,
  type MockApiError,
} from "./mockApi";
import type { LoginRequest, SignupRequest } from "@ntgm/sdk";

type AuthContextValue = {
  user: AccountUser | null;
  isAuthenticated: boolean;
  plan: Plan;
  hasPaid: boolean;
  isLoading: boolean;
  login: (req: LoginRequest) => Promise<void>;
  signup: (req: SignupRequest) => Promise<void>;
  logout: () => void;
  setPlan: (plan: Plan) => void;
  refresh: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // SSR/初次渲染：isLoading=true，user=null，避免水合错位
  const [user, setUser] = useState<AccountUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    if (typeof window === "undefined") return;
    setUser(getCurrentUser());
  }, []);

  useEffect(() => {
    // 客户端水合后才读 localStorage
    ensureDemoUser();
    refresh();
    setIsLoading(false);
  }, [refresh]);

  const login = useCallback(async (req: LoginRequest) => {
    const res = await apiLogin(req);
    setUser(res.user);
  }, []);

  const signup = useCallback(async (req: SignupRequest) => {
    const res = await apiSignup(req);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const setPlan = useCallback(
    (next: Plan) => {
      if (!user) return;
      const updated = apiUpdatePlan(user.userId, next);
      if (updated) setUser(updated);
    },
    [user]
  );

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

// 错误归一化
export function toErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return (err as { message: string }).message;
  }
  return "未知错误，请稍后再试";
}

export type { MockApiError };
