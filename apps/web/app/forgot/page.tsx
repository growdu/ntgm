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
            载入中...
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
      setError("请留汝注册之号");
      return;
    }
    setSubmitting(true);
    try {
      const res = await requestPasswordReset(email);
      if (res.resetUrl) {
        setResetUrl(res.resetUrl);
      } else {
        // 邮箱不存在，但出于安全不告诉用户 — 仍然示「已发送」
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
          <h1 className="authTitle">寻回密语</h1>
          <p className="authSubtitle">入汝注册之号，吾遣重置之简</p>
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
                  若该邮箱已注册，重置链接已发送
                </p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  烦请查收（兼杂尘）。未得复书，可校核拼写。
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
                  重置之简已成（示例项目）
                </p>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-muted)",
                    marginBottom: 16,
                  }}
                >
                  实际之境，简以邮件传之。今直接示之：
                </p>
                <Link
                  href={resetUrl}
                  className="btn btn-primary btnBlock"
                  style={{ marginBottom: 12 }}
                >
                  启重置之简 →
                </Link>
                <button
                  onClick={() => {
                    setResetUrl(null);
                    setEmail("");
                  }}
                  className="btn btn-ghost btnBlock"
                  style={{ fontSize: "0.85rem" }}
                >
                  异号复试
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
              {submitting ? "传书中..." : "传重置之简"}
            </button>

            <p className="formHint" style={{ textAlign: "center" }}>
              简 30 刻内有效。
            </p>
          </form>
        )}

        <div className="authDivider">示</div>

        <div className="authFooter">
          忽忆之？<Link href="/login">归位</Link>
          <span style={{ margin: "0 8px" }}>·</span>
          <Link href="/signup">结新缘</Link>
        </div>
      </div>

      {error && <Toast message={error} type="error" />}
    </div>
  );
}
