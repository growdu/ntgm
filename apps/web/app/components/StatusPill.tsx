"use client";

import { useState } from "react";
import {
  useApiHealth,
  statusLabel,
  statusColor,
  type ApiHealthStatus,
} from "../../lib/apiHealth";
import styles from "./StatusPill.module.css";

function formatTime(d: Date | null): string {
  if (!d) return "";
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function StatusPill() {
  const { status, latencyMs, lastChecked, checks, refresh } = useApiHealth();
  const [showDetails, setShowDetails] = useState(false);
  const color = statusColor(status);

  const isReady = status === "ready";
  const isChecking = status === "checking";

  return (
    <div
      className={styles.wrap}
      onMouseEnter={() => setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
    >
      <button
        className={styles.pill}
        onClick={() => refresh()}
        style={{
          background: color.bg,
          borderColor: color.dot,
        }}
        title="点击刷新，点击查看详情"
        aria-label="服务状态"
      >
        <span
          className={`${styles.dot} ${isChecking ? styles.dotPulse : ""}`}
          style={{ background: color.dot }}
        />
        <span className={styles.label} style={{ color: color.text }}>
          {statusLabel(status)}
        </span>
        {latencyMs !== null && isReady && (
          <span className={styles.latency}>{latencyMs}ms</span>
        )}
      </button>

      {showDetails && (
        <div className={styles.popover}>
          <div className={styles.popoverHeader}>
            <span style={{ color: color.text, fontWeight: 600 }}>
              {statusLabel(status)}
            </span>
            <span className={styles.popoverTime}>
              {formatTime(lastChecked)}
            </span>
          </div>
          <div className={styles.popoverChecks}>
            <CheckRow
              name="数据库"
              state={checks.database ?? "—"}
              ok={checks.database === "ok"}
            />
            <CheckRow
              name="缓存"
              state={checks.redis ?? "—"}
              ok={checks.redis === "ok"}
            />
            <CheckRow
              name="对象存储"
              state={checks.objectStorage ?? "—"}
              ok={checks.objectStorage === "ok"}
            />
          </div>
          {latencyMs !== null && (
            <div className={styles.popoverFooter}>
              <span>延迟 {latencyMs}ms</span>
              <span>·</span>
              <span>每 30s 自动检测</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CheckRow({
  name,
  state,
  ok,
}: {
  name: string;
  state: string;
  ok: boolean;
}) {
  return (
    <div className={styles.checkRow}>
      <span className={styles.checkName}>{name}</span>
      <span
        className={styles.checkState}
        style={{
          color: ok ? "#5a9e8f" : state === "—" ? "#6b5d52" : "#c94040",
        }}
      >
        {ok ? "● 正常" : state === "—" ? "○ 等待" : "✕ 异常"}
      </span>
    </div>
  );
}
