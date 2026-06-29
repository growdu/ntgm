"use client";

import { useEffect, useState, type FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "../components/Navigation";
import { useAuth, toErrorMessage } from "../../lib/auth";
import { Toast } from "../components/Toast";

export default function SignupPage() {
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
        <SignupContent />
      </Suspense>
    </AppShell>
  );
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/home";
  const { signup, isAuthenticated, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace(next);
    }
  }, [isAuthenticated, isLoading, next, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirm) {
      setError("两次所入之密语不一");
      return;
    }
    if (password.length < 6) {
      setError("密语至少六字");
      return;
    }
    if (!email.trim() || !displayName.trim()) {
      setError("请留名号与字号");
      return;
    }

    setSubmitting(true);
    try {
      await signup({ email, password, displayName });
      setSuccess("结缘成！正为你转...");
      setTimeout(() => {
        router.push(next);
      }, 600);
    } catch (err) {
      setError(toErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="authShell">
        <div className="authLayout">
          {/* Left: 免费之惠 */}
          <aside className="authBenefits">
            <h2 className="authBenefitsTitle">
              免费开启你的<span className="authBenefitsAccent"> 命理画像 </span>之旅
            </h2>
            <p className="authBenefitsIntro">
              以道御术，以术证道。结缘即得：
            </p>
            <ul className="authBenefitsList">
              <li className="authBenefitItem">
                <span className="authBenefitBullet">壹</span>
                完整八字命盘解析（不取分文）
              </li>
              <li className="authBenefitItem">
                <span className="authBenefitBullet">贰</span>
                五维性情画像
              </li>
              <li className="authBenefitItem">
                <span className="authBenefitBullet">叁</span>
                古来人物同炉 · 觅精神同频者
              </li>
              <li className="authBenefitItem">
                <span className="authBenefitBullet">肆</span>
                日日个性化之议（初境每日三条）
              </li>
              <li className="authBenefitItem">
                <span className="authBenefitBullet">伍</span>
                数据本地所存 · 私隐自掌
              </li>
            </ul>
            <div className="authSocialProof">
              💡 提示：结缘完全免费，无须绑定任何凭信。进阶套餐仅在你主动升起时方收分文。
            </div>
          </aside>

          {/* Right: Signup Form */}
          <div className="authCard">
            <div className="authHeader">
              <h1 className="authTitle">结缘</h1>
              <p className="authSubtitle">三十息立号，开汝之画像</p>
            </div>

          <form className="authForm" onSubmit={handleSubmit} noValidate>
            <div className="formField">
              <label htmlFor="displayName" className="formLabel">
                字号
              </label>
              <input
                id="displayName"
                type="text"
                className="formInput"
                placeholder="汝欲如何被称"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={submitting}
                autoComplete="nickname"
                required
              />
            </div>

            <div className="formField">
              <label htmlFor="email" className="formLabel">
                名号（邮箱）
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
                密语（密码）
              </label>
              <input
                id="password"
                type="password"
                className="formInput"
                placeholder="至少六字"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="formField">
              <label htmlFor="confirm" className="formLabel">
                再入密语
              </label>
              <input
                id="confirm"
                type="password"
                className="formInput"
                placeholder="再入一次"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={submitting}
                autoComplete="new-password"
                required
              />
            </div>

            {error && (
              <div className="formError" role="alert">
                ⚠ {error}
              </div>
            )}
            {success && (
              <div
                style={{
                  color: "var(--accent-jade-light)",
                  fontSize: "0.85rem",
                }}
              >
                ✓ {success}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btnBlock btnLarge"
              disabled={submitting}
            >
              {submitting ? "结缘中..." : "结缘入道"}
            </button>

            <p className="formHint" style={{ textAlign: "center" }}>
              结缘即示允《用户之约》与《私隐之护》
            </p>
          </form>

          <div className="authDivider">或</div>

          <div className="authFooter">
            已有号？
            <Link href={`/login?next=${encodeURIComponent(next)}`}>
              归位续修
            </Link>
          </div>
          </div>
        </div>
      </div>

      {success && <Toast message={success} type="success" />}
    </>
  );
}
