"use client";

import { useState, type FormEvent, Suspense } from "react";
import Link from "next/link";
import { AppShell } from "../components/Navigation";
import { requestPasswordReset } from "../../lib/mockApi";
import { Toast } from "../components/Toast";
import { toErrorMessage } from "../../lib/auth";

export default function ForgotPage() {
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
        <ForgotContent />
      </Suspense>
    </AppShell>
  );
}

function ForgotContent() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetUrl(null);
    if (!email.trim()) {
      setError("请填写注册邮箱");
      return;
    }
    setSubmitting(true);
    try {
      const res = await requestPasswordReset(email);
      if (res.resetUrl) {
        setResetUrl(res.resetUrl);
      } else {
        // 邮箱不存在，但出于安全不告诉用户 — 仍然提示「已发送」
        setResetUrl("__not_found__");
      }
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="authShell">
      <div className="authCard">
        <div className="authHeader">
          <h1 className="authTitle">找回密码</h1>
          <p className="authSubtitle">输入注册邮箱，我们会发送重置链接</p>
        </div>

        {resetUrl ? (
          <div
            style={{
              background: "rgba(90, 158, 143, 0.12)",
              border: "1px solid rgba(90, 158, 143, 0.4)",
              borderRadius: 10,
              padding: 20,
              textAlign: "center",
              color: "var(--text-primary)",
            }}
          >
            {resetUrl === "__not_found__" ? (
              <>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>📧</div>
                <p
                  style={{
                    color: "var(--accent-jade-light)",
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  如果该邮箱已注册，重置链接已发送
                </p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  请检查邮箱（含垃圾邮件）。若没收到，请确认邮箱拼写。
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>📬</div>
                <p
                  style={{
                    color: "var(--accent-jade-light)",
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  重置链接已生成（演示项目）
                </p>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-muted)",
                    marginBottom: 16,
                  }}
                >
                  真实场景下，链接会通过邮件发送。这里直接展示：
                </p>
                <Link
                  href={resetUrl}
                  className="btn btn-primary btnBlock"
                  style={{ marginBottom: 12 }}
                >
                  打开重置链接 →
                </Link>
                <button
                  onClick={() => {
                    setResetUrl(null);
                    setEmail("");
                  }}
                  className="btn btn-ghost btnBlock"
                  style={{ fontSize: "0.85rem" }}
                >
                  用别的邮箱重试
                </button>
              </>
            )}
          </div>
        ) : (
          <form className="authForm" onSubmit={handleSubmit} noValidate>
            <div className="formField">
              <label htmlFor="email" className="formLabel">
                注册邮箱
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
              {submitting ? "发送中..." : "发送重置链接"}
            </button>

            <p className="formHint" style={{ textAlign: "center" }}>
              链接 30 分钟内有效。
            </p>
          </form>
        )}

        <div className="authDivider">提示</div>

        <div className="authFooter">
          想起来了？<Link href="/login">直接登录</Link>
          <span style={{ margin: "0 8px" }}>·</span>
          <Link href="/signup">注册新账号</Link>
        </div>
      </div>

      {error && <Toast message={error} type="error" />}
    </div>
  );
}
