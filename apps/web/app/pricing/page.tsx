"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "../components/Navigation";
import { useAuth, toErrorMessage } from "../../lib/auth";
import { getPricingPlans } from "../../lib/mockApi";
import { getCheckoutProvider } from "../../lib/checkout-provider";
import { Toast } from "../components/Toast";
import type { Plan } from "@ntgm/sdk";

function formatPrice(cents: number): string {
  if (cents === 0) return "0";
  return (cents / 100).toFixed(0);
}

export default function PricingPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div
            style={{
              padding: 80,
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            加载中...
          </div>
        }
      >
        <PricingContent />
      </Suspense>
    </AppShell>
  );
}

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/create";
  const { user, isAuthenticated, plan } = useAuth();
  const checkoutProvider = getCheckoutProvider();

  const [submitting, setSubmitting] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const plans = getPricingPlans();

  const handleChoose = async (planId: Plan) => {
    setError(null);
    setSuccess(null);

    if (!isAuthenticated) {
      router.push(`/signup?next=${encodeURIComponent("/pricing")}`);
      return;
    }
    if (planId === "free") {
      router.push("/onboarding");
      return;
    }

    setSubmitting(planId);
    try {
      const provider = getCheckoutProvider();
      const result = await provider.createCheckout({
        planId,
        paymentMethod: "wechat",
      });
      setSuccess(`已升级到 ${planId.toUpperCase()}，正在跳转...`);
      setTimeout(() => {
        router.push(result.redirectUrl);
      }, 800);
    } catch (err) {
      setError(toErrorMessage(err));
      setSubmitting(null);
    }
  };

  return (
    <>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 24px" }}>
        <div className="sectionHeader">
          <span className="sectionEyebrow">定价</span>
          <h1 className="sectionTitle">选择适合你的套餐</h1>
          <p className="sectionSubtitle">
            免费版可体验完整主流程，Pro / Master 解锁创作、PDF
            导出、持续画像演进等全部能力。
          </p>
        </div>

        <div className="pricingGrid">
          {plans.map((p) => {
            const isCurrent = user?.plan === p.id;
            const isHighlight = !!p.highlight;
            return (
              <div
                key={p.id}
                className={`pricingCard ${isHighlight ? "pricingCardHighlight" : ""}`}
              >
                {p.badge && <div className="pricingBadge">{p.badge}</div>}

                <div className="pricingPlanName">{p.name}</div>
                <div className="pricingPlanDesc">{p.description}</div>

                <div className="pricingPrice">
                  <span className="pricingPriceCurrency">¥</span>
                  <span className="pricingPriceAmount">
                    {formatPrice(p.priceCents)}
                  </span>
                  <span className="pricingPriceUnit">
                    {p.priceCents === 0 ? "永久免费" : "/ 月"}
                  </span>
                </div>

                <ul className="pricingFeatureList">
                  {p.features.map((f) => (
                    <li key={f} className="pricingFeature">
                      {f}
                    </li>
                  ))}
                  {(p.excludedFeatures ?? []).map((f) => (
                    <li key={f} className="pricingFeature pricingFeatureMuted">
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button
                    className="btn btn-ghost btnBlock btnLarge"
                    disabled
                    style={{ opacity: 0.6 }}
                  >
                    当前套餐
                  </button>
                ) : (
                  <button
                    className={`btn ${isHighlight ? "btn-primary" : "btn-secondary"} btnBlock btnLarge`}
                    onClick={() => handleChoose(p.id)}
                    disabled={submitting !== null}
                  >
                    {submitting === p.id
                      ? "处理中..."
                      : p.id === "free"
                        ? "开始免费试用"
                        : `升级到 ${p.name.split(" ")[0]}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="authDivider" style={{ marginTop: 64 }}>
          常见问题
        </div>

        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            color: "var(--text-secondary)",
            fontSize: "0.92rem",
          }}
        >
          <Faq
            q="可以随时取消订阅吗？"
            a="可以。套餐在下一个计费周期前可随时取消，不会重复扣费。"
          />
          <Faq
            q="付费后可以升级到 Master 吗？"
            a="可以，按差价补足即可，已支付的部分会按比例折算。"
          />
          <Faq
            q="数据是否安全？"
            a="演示项目数据仅保存在你的浏览器本地。生产环境会全程加密并支持导出。"
          />
          <Faq
            q="演示项目能真付钱吗？"
            a={`不能。当前支付模式: ${checkoutProvider.name === "stripe" ? "Stripe test mode" : "Mock（本地立即升级）"}。`}
          />
        </div>

        <div style={{ textAlign: "center", marginTop: 64 }}>
          <Link href={next} className="btn btn-ghost">
            ← {next === "/create" ? "先看看创作" : "返回"}
          </Link>
        </div>
      </div>

      {error && <Toast message={error} type="error" />}
      {success && <Toast message={success} type="success" />}
    </>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      open={open}
      onClick={(e) => {
        e.preventDefault();
        setOpen(!open);
      }}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: 10,
        padding: "16px 20px",
        cursor: "pointer",
      }}
    >
      <summary
        style={{
          color: "var(--text-primary)",
          fontWeight: 500,
          listStyle: "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {q}
        <span style={{ color: "var(--accent-gold)" }}>{open ? "−" : "+"}</span>
      </summary>
      <p style={{ marginTop: 12, lineHeight: 1.7 }}>{a}</p>
    </details>
  );
}
