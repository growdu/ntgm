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
            载入中...
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

  // 链接自动验
  useEffect(() => {
    if (!token) return;
    if (status !== "idle") return;
    if (!user) {
      setError("请先归位后再验汝之号");
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

  // 自动验中
  if (status === "verifying") {
    return (
      <div className="authShell">
        <div className="authCard" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>⏳</div>
          <h1 className="authTitle">验中...</h1>
        </div>
      </div>
    );
  }

  // 已验
  if (status === "verified" || isVerified) {
    return (
      <div className="authShell">
        <div className="authCard" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>✓</div>
          <h1 className="authTitle">邮箱已验</h1>
          <p className="authSubtitle" style={{ marginBottom: 24 }}>
            欢迎入道。{status === "verified" ? "正归静观台..." : ""}
          </p>
          <Link href="/home" className="btn btn-primary btnBlock btnLarge">
            归静观
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="authShell">
      <div className="authCard" style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>📧</div>
        <h1 className="authTitle">验汝之号</h1>
        {user ? (
          <p className="authSubtitle">
            验汝之号 <strong>{user.email}</strong> 以解全通
          </p>
        ) : (
          <p className="authSubtitle">请先归位再续</p>
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
              ✓ 验书已发（示例项目）
            </p>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                marginBottom: 12,
              }}
            >
              实际之境，书以邮件传之。今直接示之：
            </p>
            <Link href={verifyUrl} className="btn btn-primary btnBlock">
              启验之简 →
            </Link>
          </div>
        ) : (
          <button
            onClick={handleResend}
            className="btn btn-primary btnBlock btnLarge"
            disabled={resending || !user}
            style={{ marginTop: 24 }}
          >
            {resending ? "传书中..." : user ? "传验书" : "请先归位"}
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
          <Link href="/home">暂过，先观之</Link>
        </div>
      </div>

      {error && <Toast message={error} type="error" />}
    </div>
  );
}
