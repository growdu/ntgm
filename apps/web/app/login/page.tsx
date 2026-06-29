"use client";

import { useEffect, useState, type FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "../components/Navigation";
import { useAuth, toErrorMessage } from "../../lib/auth";
import { Toast } from "../components/Toast";

export default function LoginPage() {
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
        <LoginContent />
      </Suspense>
    </AppShell>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/home";
  const { login, isAuthenticated, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace(next);
    }
  }, [isAuthenticated, isLoading, next, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("请填写邮箱和密码");
      return;
    }
    setSubmitting(true);
    try {
      await login({ email, password });
      router.push(next);
    } catch (err) {
      setError(toErrorMessage(err));
      setSubmitting(false);
    }
  };

  const fillDemo = () => {
    setEmail("demo@ntgm.app");
    setPassword("demo123");
  };

  return (
    <>
      <div className="authShell">
        <div className="authLayout">
          {/* Left: Welcome Benefits */}
          <aside className="authBenefits">
            <h2 className="authBenefitsTitle">
              欢迎回到你的<span className="authBenefitsAccent"> 命理画像 </span>
            </h2>
            <p className="authBenefitsIntro">以道御术，以术证道。</p>
            <ul className="authBenefitsList">
              <li className="authBenefitItem">
                <span className="authBenefitBullet">道</span>
                持续演进的画像，不止一卦
              </li>
              <li className="authBenefitItem">
                <span className="authBenefitBullet">术</span>
                八字命盘 · 五行喜忌 · 性格倾向
              </li>
              <li className="authBenefitItem">
                <span className="authBenefitBullet">人</span>
                历史人物共鸣 · 寻精神同频者
              </li>
              <li className="authBenefitItem">
                <span className="authBenefitBullet">行</span>
                每日个性化建议 · 反馈校准
              </li>
            </ul>
          </aside>

          {/* Right: Login Form */}
          <div className="authCard">
            <div className="authHeader">
              <h1 className="authTitle">欢迎回来</h1>
              <p className="authSubtitle">登录继续你的命运画像</p>
            </div>

          <form className="authForm" onSubmit={handleSubmit} noValidate>
            <div className="formField">
              <label htmlFor="email" className="formLabel">
                邮箱
              </label>
              <input
                id="email"
                type="email"
                className="formInput"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                autoComplete="email"
                required
              />
            </div>

            <div className="formField">
              <label htmlFor="password" className="formLabel">
                密码
              </label>
              <input
                id="password"
                type="password"
                className="formInput"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="formError" role="alert">
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btnBlock btnLarge"
              disabled={submitting}
            >
              {submitting ? "登录中..." : "登录"}
            </button>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.85rem",
                color: "var(--text-muted)",
              }}
            >
              <Link href={`/signup?next=${encodeURIComponent(next)}`}>
                还没账号？免费注册
              </Link>
              <button
                type="button"
                onClick={fillDemo}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent-gold)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontFamily: "inherit",
                  padding: 0,
                }}
                title="填入演示账户"
              >
                使用演示账户
              </button>
            </div>
          </form>

          <div className="authDivider">提示</div>

          <p
            style={{
              fontSize: "0.82rem",
              color: "var(--text-muted)",
              textAlign: "center",
              lineHeight: 1.7,
            }}
          >
            首次访问？注册即可创建账号（演示项目仅本地存储）。
            <br />
            想先体验？点上方"使用演示账户"一键填入 demo@ntgm.app。
          </p>
          </div>
        </div>
      </div>

      {error && <Toast message={error} type="error" />}
    </>
  );
}
