"use client";

import { useState, type FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "../components/Navigation";
import { confirmPasswordReset } from "../../lib/mockApi";
import { Toast } from "../components/Toast";
import { toErrorMessage } from "../../lib/auth";

export default function ResetPage() {
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
        <ResetContent />
      </Suspense>
    </AppShell>
  );
}

function ResetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!token) {
      setError("无效的重置链接");
      return;
    }
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    setSubmitting(true);
    try {
      await confirmPasswordReset(token, password);
      setSuccess("密码已重置！正在跳转到登录页...");
      setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="authShell">
        <div className="authCard">
          <div className="authHeader">
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>⚠</div>
            <h1 className="authTitle">链接无效</h1>
            <p className="authSubtitle">请回到找回密码页重新申请</p>
          </div>
          <Link href="/forgot" className="btn btn-primary btnBlock btnLarge">
            重新申请
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="authShell">
      <div className="authCard">
        <div className="authHeader">
          <h1 className="authTitle">设置新密码</h1>
          <p className="authSubtitle">请输入新密码（至少 6 位）</p>
        </div>

        <form className="authForm" onSubmit={handleSubmit} noValidate>
          <div className="formField">
            <label htmlFor="password" className="formLabel">
              新密码
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
              确认新密码
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

          <button
            type="submit"
            className="btn btn-primary btnBlock btnLarge"
            disabled={submitting || !!success}
          >
            {submitting ? "重置中..." : success ? "已重置 ✓" : "重置密码"}
          </button>
        </form>

        <div className="authDivider">或</div>
        <div className="authFooter">
          <Link href="/login">回到登录</Link>
        </div>
      </div>

      {success && <Toast message={success} type="success" />}
      {error && <Toast message={error} type="error" />}
    </div>
  );
}
