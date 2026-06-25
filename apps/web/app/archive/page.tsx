"use client";

import { useEffect, useState, useRef } from "react";
import { jsPDF } from "jspdf";
import { AppShell } from "../components/Navigation";
import { Toast } from "../components/Toast";
import {
  fetchArchiveChanges,
  fetchArchiveTimeline,
  fetchProfileVersions,
  fetchCurrentProfile,
  fetchCurrentMatch,
} from "@ntgm/sdk";
import type {
  ProfileChangeLogItem,
  ArchiveTimelineItem,
  ProfileVersionItem,
  ProfileSummaryResponse,
  MatchCurrentResponse,
} from "@ntgm/sdk";
import styles from "./archive.module.css";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export default function ArchivePage() {
  const [changes, setChanges] = useState<ProfileChangeLogItem[]>([]);
  const [timeline, setTimeline] = useState<ArchiveTimelineItem[]>([]);
  const [versions, setVersions] = useState<ProfileVersionItem[]>([]);
  const [profile, setProfile] = useState<ProfileSummaryResponse | null>(null);
  const [match, setMatch] = useState<MatchCurrentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const showToast = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      const [c, t, v, p, m] = await Promise.all([
        fetchArchiveChanges(API_BASE_URL).catch(() => ({ items: [] })),
        fetchArchiveTimeline(API_BASE_URL).catch(() => ({ items: [] })),
        fetchProfileVersions(API_BASE_URL).catch(() => ({ items: [] })),
        fetchCurrentProfile(API_BASE_URL).catch(() => null),
        fetchCurrentMatch(API_BASE_URL).catch(() => null),
      ]);
      setChanges(c.items);
      setTimeline(t.items);
      setVersions(v.items);
      setProfile(p);
      setMatch(m);
      setLoading(false);
    };
    load();
  }, []);

  const handleExport = async (type: "pdf" | "poster") => {
    setExporting(type);
    try {
      if (type === "pdf") {
        const doc = new jsPDF("p", "mm", "a4");
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        doc.setFillColor(13, 16, 22);
        doc.rect(0, 0, pageWidth, 40, "F");
        doc.setTextColor(182, 136, 61);
        doc.setFontSize(24);
        doc.text("逆天改命 · 成长档案", pageWidth / 2, 25, { align: "center" });

        // Profile info
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(14);
        const currentV = profile?.profileVersion ?? currentVersion;
        doc.text(`当前画像: V${currentV}`, 20, 55);

        // Match info
        const topMatch = match?.topMatches?.[0];
        if (topMatch) {
          doc.text(
            `最像: ${topMatch.figureName} (${Math.round(topMatch.similarityScore * 100)}%相似)`,
            20,
            65
          );
        }

        // Version timeline
        let y = 80;
        doc.setFontSize(12);
        doc.setTextColor(182, 136, 61);
        doc.text("版本演进时间线", 20, y);
        y += 10;

        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        timeline.slice(0, 10).forEach((item) => {
          const date = new Date(item.occurredAt).toLocaleDateString("zh-CN");
          doc.text(
            `[V${item.profileVersion ?? "?"}] ${date} - ${item.title}`,
            20,
            y
          );
          y += 8;
          if (y > 270) return;
        });

        // Version changes
        y += 5;
        doc.setFontSize(12);
        doc.setTextColor(182, 136, 61);
        doc.text("画像版本变化", 20, y);
        y += 10;

        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        changes.forEach((change) => {
          const headline = change.reasonSummary.headline ?? "更新";
          doc.text(
            `V${change.fromVersion} → V${change.toVersion}: ${headline}`,
            20,
            y
          );
          y += 8;
          if (y > 270) return;
        });

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`导出时间: ${new Date().toLocaleString("zh-CN")}`, 20, 290);
        doc.text("逆天改命算命软件", pageWidth - 20, 290, { align: "right" });

        doc.save(`逆天改命-成长档案-V${currentV}.pdf`);
        showToast("PDF 导出成功！", "success");
      } else {
        // Poster generation
        const canvas = document.createElement("canvas");
        canvas.width = 800;
        canvas.height = 1000;
        const ctx = canvas.getContext("2d")!;

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, "#0d1016");
        gradient.addColorStop(0.5, "#111827");
        gradient.addColorStop(1, "#0d1016");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Decorative circle
        ctx.strokeStyle = "rgba(182, 136, 61, 0.1)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(400, 200, 150, 0, Math.PI * 2);
        ctx.stroke();

        // Title
        ctx.fillStyle = "#b6883d";
        ctx.font = "bold 48px serif";
        ctx.textAlign = "center";
        ctx.fillText("逆天改命", 400, 120);

        ctx.fillStyle = "#f3ead7";
        ctx.font = "18px serif";
        ctx.fillText("我的命运画像档案", 400, 160);

        // Version
        const currentV = profile?.profileVersion ?? currentVersion;
        ctx.fillStyle = "#b6883d";
        ctx.font = "bold 36px serif";
        ctx.fillText(`V${currentV}`, 400, 280);

        // Match figure
        const topMatch = match?.topMatches?.[0];
        if (topMatch) {
          ctx.fillStyle = "#f3ead7";
          ctx.font = "24px serif";
          ctx.fillText(`最像: ${topMatch.figureName}`, 400, 340);
          ctx.font = "18px serif";
          ctx.fillStyle = "#a8998a";
          ctx.fillText(
            `${Math.round(topMatch.similarityScore * 100)}% 相似度`,
            400,
            370
          );
        }

        // Stats
        ctx.fillStyle = "#f3ead7";
        ctx.font = "14px serif";
        const statsY = 450;
        ctx.fillText(`画像版本: ${versions.length}`, 400, statsY);
        ctx.fillText(`版本变化: ${changes.length}`, 400, statsY + 25);
        ctx.fillText(`时间线事件: ${timeline.length}`, 400, statsY + 50);

        // Keywords
        const summary = profile?.summary as Record<string, unknown> | null;
        const keywords = summary?.keywords as string[] | null;
        if (keywords && keywords.length > 0) {
          ctx.fillStyle = "#b6883d";
          ctx.font = "16px serif";
          ctx.fillText(keywords.slice(0, 4).join(" / "), 400, 560);
        }

        // Footer
        ctx.fillStyle = "#6b5d52";
        ctx.font = "12px serif";
        ctx.fillText(
          `生成时间: ${new Date().toLocaleDateString("zh-CN")}`,
          400,
          950
        );

        // Download poster
        const link = document.createElement("a");
        link.download = `逆天改命-分享海报-V${currentV}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        showToast("分享海报已生成！", "success");
      }
    } catch (error) {
      console.error("Export error:", error);
      showToast("导出失败，请重试", "error");
    }
    setExporting(null);
  };

  if (loading) {
    return (
      <AppShell>
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.loading}>
              <div className={styles.loadingSpinner} />
              <span className={styles.loadingText}>加载成长档案中...</span>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const currentVersion =
    versions.length > 0
      ? Math.max(...versions.map((v) => v.profileVersion))
      : 0;

  return (
    <AppShell>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <h1 className={styles.title}>你的成长档案</h1>
            <p className={styles.subtitle}>
              记录你的画像演进历程，追踪命运变化轨迹
            </p>
          </div>

          <div className={styles.content}>
            {/* 左侧时间线 */}
            <div className={styles.mainSection}>
              {/* 版本时间线 */}
              <div className={`${styles.card} ${styles.timelineCard}`}>
                <div className="card-header">
                  <span className="card-title">版本时间线</span>
                </div>
                <div className={styles.timeline}>
                  {timeline.map((item, index) => (
                    <div
                      key={`${item.itemType}-${index}`}
                      className={styles.timelineItem}
                    >
                      <div className={styles.timelineDot}>
                        <span className="version-tag">
                          V{item.profileVersion ?? "?"}
                        </span>
                      </div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineMeta}>
                          <span className={styles.timelineDate}>
                            {new Date(item.occurredAt).toLocaleDateString(
                              "zh-CN"
                            )}
                          </span>
                          <span className={styles.timelineTitle}>
                            {item.title}
                          </span>
                        </div>
                        <p className={styles.timelineDesc}>{item.summary}</p>
                      </div>
                      {index < timeline.length - 1 && (
                        <div className={styles.timelineLine} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 画像变化历史 */}
              <div className={`${styles.card} ${styles.figuresCard}`}>
                <div className="card-header">
                  <span className="card-title">画像变化历史</span>
                </div>
                <div className={styles.figureTrail}>
                  {changes.map((change, index) => (
                    <div key={change.changeId} className={styles.figureItem}>
                      <div className={styles.figureAvatar}>
                        <span>{change.toVersion}</span>
                      </div>
                      <span className={styles.figureName}>
                        V{change.fromVersion} → V{change.toVersion}
                      </span>
                      <span className={styles.figureVersion}>
                        {change.reasonSummary.headline ?? "更新"}
                      </span>
                      {index < changes.length - 1 && (
                        <div className={styles.figureArrow}>→</div>
                      )}
                    </div>
                  ))}
                </div>
                <p className={styles.figureNote}>
                  {changes.length > 0
                    ? (changes[changes.length - 1].reasonSummary.trigger ??
                      "系统持续追踪你的变化轨迹")
                    : "暂无变化记录"}
                </p>
              </div>

              {/* 画像版本列表 */}
              <div className={`${styles.card} ${styles.versionsCard}`}>
                <div className="card-header">
                  <span className="card-title">画像版本列表</span>
                </div>
                <div className={styles.versionsList}>
                  {versions
                    .sort((a, b) => b.profileVersion - a.profileVersion)
                    .map((version) => (
                      <div
                        key={version.profileId}
                        className={styles.versionItem}
                      >
                        <div className={styles.versionHeader}>
                          <span className="version-tag">
                            {version.profileVersion}
                          </span>
                          <span className={styles.versionLabel}>版本</span>
                          {version.profileVersion === currentVersion && (
                            <span className="tag tag-success">当前</span>
                          )}
                        </div>
                        <div className={styles.versionStats}>
                          <div className={styles.versionStat}>
                            <span className={styles.statLabel}>置信度</span>
                            <span className={styles.statValue}>
                              {typeof version.summary.confidence === "number"
                                ? `${(version.summary.confidence * 100).toFixed(0)}%`
                                : "N/A"}
                            </span>
                          </div>
                          <div className={styles.versionStat}>
                            <span className={styles.statLabel}>引擎版本</span>
                            <span className={styles.statValue}>
                              {version.engineVersion}
                            </span>
                          </div>
                        </div>
                        {version.profileVersion === currentVersion && (
                          <div className={styles.versionNote}>
                            最新版本，画像最为完善
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* 右侧辅助 */}
            <div className={styles.sidebar}>
              {/* 导出功能 */}
              <div className={`${styles.card} ${styles.exportCard}`}>
                <h3 className={styles.exportTitle}>导出与分享</h3>
                <p className={styles.exportText}>
                  将你的成长档案导出为 PDF 或生成分享海报
                </p>
                <div className={styles.exportActions}>
                  <button
                    className={styles.exportBtn}
                    onClick={() => handleExport("pdf")}
                    disabled={exporting === "pdf"}
                  >
                    <span className={styles.exportIcon}>
                      {exporting === "pdf" ? "⏳" : "📄"}
                    </span>
                    {exporting === "pdf" ? "导出中..." : "导出 PDF"}
                  </button>
                  <button
                    className={styles.exportBtn}
                    onClick={() => handleExport("poster")}
                    disabled={exporting === "poster"}
                  >
                    <span className={styles.exportIcon}>
                      {exporting === "poster" ? "⏳" : "🖼"}
                    </span>
                    {exporting === "poster" ? "生成中..." : "生成分享海报"}
                  </button>
                </div>
              </div>

              {/* 统计 */}
              <div className={`${styles.card} ${styles.statsCard}`}>
                <h3 className={styles.statsTitle}>档案统计</h3>
                <div className={styles.statsList}>
                  <div className={styles.statItem}>
                    <span className={styles.statNumber}>{versions.length}</span>
                    <span className={styles.statName}>画像版本</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statNumber}>{changes.length}</span>
                    <span className={styles.statName}>版本变化</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statNumber}>{timeline.length}</span>
                    <span className={styles.statName}>时间线事件</span>
                  </div>
                </div>
              </div>

              {/* 说明 */}
              <div className={`${styles.card} ${styles.infoCard}`}>
                <h3 className={styles.infoTitle}>成长档案说明</h3>
                <p className={styles.infoText}>
                  你的每一版画像都会被完整保存，系统持续追踪你的性格、能力、关系模式的演变轨迹。
                </p>
                <p className={styles.infoText}>
                  通过回顾历史版本，你可以清晰地看到「系统是如何逐步认识你的」。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
