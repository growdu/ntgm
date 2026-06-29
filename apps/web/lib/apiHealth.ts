/**
 * API Health Monitor
 *
 * Lightweight health-check that pings /api/v1/ready periodically
 * and exposes the result for UI status indicators.
 *
 * Usage:
 *   const { status, latencyMs, lastChecked, refresh } = useApiHealth();
 *   // status: 'checking' | 'ready' | 'degraded' | 'offline'
 */

import { useEffect, useState, useCallback, useRef } from "react";

export type ApiHealthStatus =
  | "checking"
  | "ready"
  | "degraded"
  | "offline";

export interface ApiHealth {
  status: ApiHealthStatus;
  latencyMs: number | null;
  lastChecked: Date | null;
  checks: {
    database?: "ok" | string;
    redis?: "ok" | string;
    objectStorage?: "ok" | string;
  };
  refresh: () => void;
}

const DEFAULT_POLL_MS = 30_000;
const FETCH_TIMEOUT_MS = 5_000;

async function fetchHealth(
  baseUrl: string,
  signal: AbortSignal,
): Promise<{ ok: boolean; latencyMs: number; checks: ApiHealth["checks"] }> {
  const t0 = performance.now();
  const res = await fetch(`${baseUrl}/api/v1/ready`, {
    signal,
    cache: "no-store",
  });
  const latencyMs = Math.round(performance.now() - t0);
  if (!res.ok) {
    return { ok: false, latencyMs, checks: {} };
  }
  const body = (await res.json().catch(() => null)) as
    | { success?: boolean; data?: { checks?: ApiHealth["checks"] } }
    | null;
  const checks = body?.data?.checks ?? {};
  const allOk = Object.values(checks).every((v) => v === "ok");
  return { ok: allOk, latencyMs, checks };
}

export function useApiHealth(
  baseUrl?: string,
  pollMs: number = DEFAULT_POLL_MS,
): ApiHealth {
  const url =
    baseUrl ??
    (typeof window !== "undefined"
      ? (window as any).__NEXT_DATA__?.props?.pageProps?.apiBaseUrl
      : null) ??
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1$/, "") ??
    "http://localhost:8001";

  const [status, setStatus] = useState<ApiHealthStatus>("checking");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checks, setChecks] = useState<ApiHealth["checks"]>({});
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const r = await fetchHealth(url, ctrl.signal);
      setLatencyMs(r.latencyMs);
      setChecks(r.checks);
      setLastChecked(new Date());
      if (r.ok) {
        setStatus("ready");
      } else if (Object.keys(r.checks).length > 0) {
        setStatus("degraded");
      } else {
        setStatus("offline");
      }
    } catch (e) {
      setStatus("offline");
      setLastChecked(new Date());
    } finally {
      clearTimeout(timer);
    }
  }, [url]);

  useEffect(() => {
    run();
    const id = setInterval(run, pollMs);
    const onVis = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      abortRef.current?.abort();
    };
  }, [run, pollMs]);

  return { status, latencyMs, lastChecked, checks, refresh: run };
}

export function statusLabel(s: ApiHealthStatus): string {
  switch (s) {
    case "ready":
      return "服务正常";
    case "degraded":
      return "部分异常";
    case "offline":
      return "服务离线";
    default:
      return "检测中";
  }
}

export function statusColor(s: ApiHealthStatus): {
  dot: string;
  text: string;
  bg: string;
} {
  switch (s) {
    case "ready":
      return { dot: "#3d7a6e", text: "#5a9e8f", bg: "rgba(61,122,110,0.12)" };
    case "degraded":
      return { dot: "#b6883d", text: "#d4a856", bg: "rgba(182,136,61,0.12)" };
    case "offline":
      return { dot: "#c94040", text: "#e07070", bg: "rgba(201,64,64,0.12)" };
    default:
      return { dot: "#6b5d52", text: "#a8998a", bg: "rgba(168,153,138,0.10)" };
  }
}
