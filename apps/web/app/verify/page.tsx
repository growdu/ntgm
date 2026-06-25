"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "../components/Navigation";
import { useAuth, toErrorMessage } from "../../lib/auth";
import {
  confirmEmailVerify,
  isCurrentUserEmailVerified,
  sendVerifyEmail,
} from "../../lib/mockApi";
import { Toast } from "../components/Toast";

export default function VerifyPage() {
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
        <VerifyContent />
      </Suspense>
    </AppShell>
  );
}

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const { user, refresh } = useAuth();
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "verifying" | "verified" | "failed"
  >("idle");
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (user) {
      setIsVerified(isCurrentUserEmailVerified());
    }
  }, [user]);

  // 链接自动验证
  useEffect(() => {
    if (!token) return;
    if (status !== "idle") return;
    if (!user) {
      setError("请先登录后再验证邮箱");
      return;
    }
    setStatus("verifying");
    confirmEmailVerify(token)
      .then(() => {
        setStatus("verified");
        setIsVerified(true);
        // 1.5s 后回 /home
        setTimeout(() => router.push("/home"), 1500);
      })
      .catch((err) => {
        setError(toErrorMessage(err));
        setStatus("failed");
      });
  }, [token, user, status, router]);

  const handleResend = async () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent("/verify")}`);
      return;
    }
    setError(null);
    setResending(true);
    try {
      const res = await sendVerifyEmail();
      setVerifyUrl(res.verifyUrl);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  // 自动验证中
  if (status === "verifying") {
    return (
      <div className="authShell">
        <div className="authCard" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>⏳</div>
          <h1 className="authTitle">正在验证...</h1>
        </div>
      </div>
    );
  }

  // 已验证
  if (status === "verified" || isVerified) {
    return (
      <div className="authShell">
        <div className="authCard" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>✓</div>
          <h1 className="authTitle">邮箱已验证</h1>
          <p className="authSubtitle" style={{ marginBottom: 24 }}>
            欢迎加入。{status === "verified" ? "正在跳转..." : ""}
          </p>
          <Link href="/home" className="btn btn-primary btnBlock btnLarge">
            进入工作台
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="authShell">
      <div className="authCard" style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>📧</div>
        <h1 className="authTitle">验证你的邮箱</h1>
        {user ? (
          <p className="authSubtitle">
            验证邮箱 <strong>{user.email}</strong> 以解锁全部功能
          </p>
        ) : (
          <p className="authSubtitle">请先登录后再继续</p>
        )}

        {verifyUrl ? (
          <div
            style={{
              background: "rgba(90, 158, 143, 0.12)",
              border: "1px solid rgba(90, 158, 143, 0.4)",
              borderRadius: 10,
              padding: 16,
              marginTop: 24,
            }}
          >
            <p style={{ color: "var(--accent-jade-light)", marginBottom: 12 }}>
              ✓ 验证邮件已发送（演示项目）
            </p>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                marginBottom: 12,
              }}
            >
              真实场景会通过邮件投递。这里直接打开：
            </p>
            <Link href={verifyUrl} className="btn btn-primary btnBlock">
              打开验证链接 →
            </Link>
          </div>
        ) : (
          <button
            onClick={handleResend}
            className="btn btn-primary btnBlock btnLarge"
            disabled={resending || !user}
            style={{ marginTop: 24 }}
          >
            {resending ? "发送中..." : user ? "发送验证邮件" : "请先登录"}
          </button>
        )}

        {error && (
          <div className="formError" style={{ marginTop: 16 }} role="alert">
            ⚠ {error}
          </div>
        )}

        <div className="authDivider" style={{ marginTop: 32 }}>
          或
        </div>
        <div className="authFooter">
          <Link href="/home">跳过，先逛逛</Link>
        </div>
      </div>

      {error && <Toast message={error} type="error" />}
    </div>
  );
}
