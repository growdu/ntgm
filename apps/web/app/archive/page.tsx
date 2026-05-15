"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../components/Navigation";
import { fetchArchiveChanges, fetchArchiveTimeline, fetchProfileVersions } from "@ntgm/sdk";
import type { ProfileChangeLogItem, ArchiveTimelineItem, ProfileVersionItem } from "@ntgm/sdk";
import styles from "./archive.module.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export default function ArchivePage() {
  const [changes, setChanges] = useState<ProfileChangeLogItem[]>([]);
  const [timeline, setTimeline] = useState<ArchiveTimelineItem[]>([]);
  const [versions, setVersions] = useState<ProfileVersionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [c, t, v] = await Promise.all([
        fetchArchiveChanges(API_BASE_URL).catch(() => ({ items: [] })),
        fetchArchiveTimeline(API_BASE_URL).catch(() => ({ items: [] })),
        fetchProfileVersions(API_BASE_URL).catch(() => ({ items: [] })),
      ]);
      setChanges(c.items);
      setTimeline(t.items);
      setVersions(v.items);
      setLoading(false);
    };
    load();
  }, []);

  const handleExport = (type: "pdf" | "poster") => {
    setExporting(type);
    setTimeout(() => {
      if (type === "pdf") {
        alert("PDF 导出功能正在开发中，敬请期待！");
      } else {
        alert("分享海报功能正在开发中，敬请期待！");
      }
      setExporting(null);
    }, 1500);
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

  const currentVersion = versions.length > 0
    ? Math.max(...versions.map((v) => v.profileVersion))
    : 0;

  return (
    <AppShell>
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
                    <div key={`${item.itemType}-${index}`} className={styles.timelineItem}>
                      <div className={styles.timelineDot}>
                        <span className="version-tag">V{item.profileVersion ?? "?"}</span>
                      </div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineMeta}>
                          <span className={styles.timelineDate}>
                            {new Date(item.occurredAt).toLocaleDateString("zh-CN")}
                          </span>
                          <span className={styles.timelineTitle}>{item.title}</span>
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
                      <span className={styles.figureName}>V{change.fromVersion} → V{change.toVersion}</span>
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
                    ? changes[changes.length - 1].reasonSummary.trigger ?? "系统持续追踪你的变化轨迹"
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
                      <div key={version.profileId} className={styles.versionItem}>
                        <div className={styles.versionHeader}>
                          <span className="version-tag">{version.profileVersion}</span>
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
                            <span className={styles.statValue}>{version.engineVersion}</span>
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