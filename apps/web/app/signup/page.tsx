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
      setError("两次输入的密码不一致");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    if (!email.trim() || !displayName.trim()) {
      setError("请填写完整信息");
      return;
    }

    setSubmitting(true);
    try {
      await signup({ email, password, displayName });
      setSuccess("注册成功！正在为你跳转...");
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
              以道御术，以术证道。注册既得：
            </p>
            <ul className="authBenefitsList">
              <li className="authBenefitItem">
                <span className="authBenefitBullet">壹</span>
                完整八字命盘分析（无需付费）
              </li>
              <li className="authBenefitItem">
                <span className="authBenefitBullet">贰</span>
                基于 5 大维度的性格画像
              </li>
              <li className="authBenefitItem">
                <span className="authBenefitBullet">叁</span>
                历史人物匹配 · 寻精神同频者
              </li>
              <li className="authBenefitItem">
                <span className="authBenefitBullet">肆</span>
                每日个性化建议（免费版每日 3 条）
              </li>
              <li className="authBenefitItem">
                <span className="authBenefitBullet">伍</span>
                数据本地保存 · 隐私可控
              </li>
            </ul>
            <div className="authSocialProof">
              💡 提示：注册完全免费，无需绑定信用卡。付费版仅在你主动升级时才会扣费。
            </div>
          </aside>

          {/* Right: Signup Form */}
          <div className="authCard">
            <div className="authHeader">
              <h1 className="authTitle">创建账号</h1>
              <p className="authSubtitle">30 秒注册，开启你的命运画像</p>
            </div>

          <form className="authForm" onSubmit={handleSubmit} noValidate>
            <div className="formField">
              <label htmlFor="displayName" className="formLabel">
                昵称
              </label>
              <input
                id="displayName"
                type="text"
                className="formInput"
                placeholder="你想怎么被称呼"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={submitting}
                autoComplete="nickname"
                required
              />
            </div>

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
                placeholder="至少 6 位"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="formField">
              <label htmlFor="confirm" className="formLabel">
                确认密码
              </label>
              <input
                id="confirm"
                type="password"
                className="formInput"
                placeholder="再输入一次"
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
              {submitting ? "注册中..." : "注册"}
            </button>

            <p className="formHint" style={{ textAlign: "center" }}>
              注册即表示同意《用户协议》和《隐私政策》
            </p>
          </form>

          <div className="authDivider">或</div>

          <div className="authFooter">
            已有账号？
            <Link href={`/login?next=${encodeURIComponent(next)}`}>
              直接登录
            </Link>
          </div>
          </div>
        </div>
      </div>

      {success && <Toast message={success} type="success" />}
    </>
  );
}
