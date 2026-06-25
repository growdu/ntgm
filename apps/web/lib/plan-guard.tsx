"use client";

/**
 * PlanGuard — 付费墙组件
 *
 * 未登录 → 跳 /signup
 * 已登录但未付费 → 展示升级提示
 * 已付费 → 渲染 children
 */

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "./auth";

type PlanGuardProps = {
  children: ReactNode;
  /** 至少需要的套餐级别 */
  requiredPlan?: "pro" | "master";
  /** true 则在不允许时强制跳转，false 则展示付费墙 */
  enforce?: boolean;
};

const PLAN_RANK: Record<"free" | "pro" | "master", number> = {
  free: 0,
  pro: 1,
  master: 2,
};

export function PlanGuard({
  children,
  requiredPlan = "pro",
  enforce = false,
}: PlanGuardProps) {
  const { user, isAuthenticated, isLoading, plan } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push(
        `/signup?next=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }
    if (enforce && PLAN_RANK[plan] < PLAN_RANK[requiredPlan]) {
      router.push(
        `/pricing?next=${encodeURIComponent(window.location.pathname)}`
      );
    }
  }, [isLoading, isAuthenticated, plan, requiredPlan, enforce, router]);

  if (isLoading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "80px 0",
          color: "var(--text-muted)",
        }}
      >
        加载中...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "80px 0",
          color: "var(--text-muted)",
        }}
      >
        正在跳转到注册页...
      </div>
    );
  }

  if (PLAN_RANK[plan] < PLAN_RANK[requiredPlan]) {
    if (enforce) {
      return (
        <div
          style={{
            textAlign: "center",
            padding: "80px 0",
            color: "var(--text-muted)",
          }}
        >
          正在跳转到付费页...
        </div>
      );
    }
    return (
      <PaywallCard
        currentPlan={plan}
        requiredPlan={requiredPlan}
        userName={user?.displayName}
      />
    );
  }

  return <>{children}</>;
}

function PaywallCard({
  currentPlan,
  requiredPlan,
  userName,
}: {
  currentPlan: "free" | "pro" | "master";
  requiredPlan: "pro" | "master";
  userName?: string;
}) {
  return (
    <div className="paywall">
      <div className="paywallCard">
        <div className="paywallIcon">🔒</div>
        <h2 className="paywallTitle">
          {requiredPlan === "master" ? "Master 大师版" : "Pro 进阶版"} 专享
        </h2>
        <p className="paywallDesc">
          {userName ? `${userName}，` : ""}你的当前套餐是{" "}
          <strong>{currentPlan.toUpperCase()}</strong>。
          <br />
          该功能仅向 <strong>{requiredPlan.toUpperCase()}</strong>{" "}
          及以上用户开放。
          <br />
          升级后即可使用创作、PDF 导出、持续画像演进等能力。
        </p>
        <div className="paywallCta">
          <Link href="/pricing" className="btn btn-primary btnLarge">
            查看套餐
          </Link>
          <Link href="/" className="btn btn-ghost btnLarge">
            回到首页
          </Link>
        </div>
      </div>
    </div>
  );
}
