"use client";

import Link from "next/link";
import { AppShell } from "../components/Navigation";
import { fetchCurrentBazi, fetchProfileVersion } from "@ntgm/sdk";
import type { BaziCurrentResponse, ProfileSummaryResponse } from "@ntgm/sdk";
import { useEffect, useState } from "react";
import styles from "./analysis.module.css";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export default function AnalysisPage() {
  const [bazi, setBazi] = useState<BaziCurrentResponse | null>(null);
  const [profileV1, setProfileV1] = useState<ProfileSummaryResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [b, p] = await Promise.all([
          fetchCurrentBazi(API_BASE_URL),
          fetchProfileVersion(API_BASE_URL, 1),
        ]);
        setBazi(b);
        setProfileV1(p);
      } catch (error) {
        console.error("Failed to load analysis data:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Extract five elements from featureData
  const fiveElements = bazi?.featureData?.fiveElements as
    | Record<string, number>
    | undefined;

  // Extract keywords from summary
  const summary = profileV1?.summary as Record<string, unknown> | undefined;
  const keywords = (summary?.keywords as string[]) ?? [
    "行动力强",
    "理性控制",
    "事业驱动",
  ];

  // Extract uncertainty from featureData
  const uncertainty = (bazi?.featureData?.uncertainty as string[]) ?? [
    "出生时辰不确定，影响事业节奏判断",
    "午时与未时出生的命盘差异较大，需进一步校准",
  ];

  // Extract interpretation from interpretationData
  const interpretationData = bazi?.interpretationData as
    | Record<string, unknown>
    | undefined;
  const interpretation =
    (interpretationData?.interpretation as string) ??
    "系统正在分析命盘数据，请稍候...";

  // Calculate overall score from confidenceMap
  const confidenceMap = profileV1?.confidenceMap as
    | Record<string, number>
    | undefined;
  const overallScore =
    confidenceMap?.overallScore !== undefined
      ? Math.round(confidenceMap.overallScore * 100)
      : 61;

  if (loading) {
    return (
      <AppShell>
        <div className={styles.loadingContainer}>
          <span className={styles.loadingText}>正在加载分析数据...</span>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerContent}>
              <div className={styles.versionInfo}>
                <span className="version-tag">
                  V{profileV1?.profileVersion ?? 1}
                </span>
                <span className={styles.versionLabel}>版本</span>
              </div>
              <h1 className={styles.title}>你的第一版命理画像</h1>
              <p className={styles.confidence}>
                当前结论置信度：<strong>{overallScore}%</strong>
              </p>
            </div>
            <div className={styles.headerNote}>
              <span className={styles.noteIcon}>💡</span>
              <span>
                这是起点，不是终局。系统会随着你的信息补充持续修正结论。
              </span>
            </div>
          </div>

          <div className={styles.content}>
            {/* 左侧主内容 */}
            <div className={styles.mainContent}>
              {/* 命盘摘要 */}
              <div className={`${styles.card} ${styles.baziCard}`}>
                <div className="card-header">
                  <span className="card-title">命盘摘要</span>
                </div>
                <div className={styles.baziGrid}>
                  <div className={styles.baziItem}>
                    <span className={styles.baziLabel}>年柱</span>
                    <span className={styles.baziValue}>
                      {bazi?.chart.yearGz ?? "待校准"}
                    </span>
                  </div>
                  <div className={styles.baziItem}>
                    <span className={styles.baziLabel}>月柱</span>
                    <span className={styles.baziValue}>
                      {bazi?.chart.monthGz ?? "待校准"}
                    </span>
                  </div>
                  <div className={styles.baziItem}>
                    <span className={styles.baziLabel}>日柱</span>
                    <span className={styles.baziValue}>
                      {bazi?.chart.dayGz ?? "待校准"}
                    </span>
                  </div>
                  <div className={styles.baziItem}>
                    <span className={styles.baziLabel}>时柱</span>
                    <span className={styles.baziValue}>
                      {bazi?.chart.hourGz ?? "待校准"}
                    </span>
                  </div>
                </div>
                <div className={styles.fiveElements}>
                  <h4 className={styles.fiveElementsTitle}>五行分布</h4>
                  <div className={styles.fiveElementsGrid}>
                    {fiveElements
                      ? Object.entries(fiveElements).map(([element, value]) => (
                          <div key={element} className={styles.fiveElementItem}>
                            <span className={styles.elementName}>
                              {element === "metal" && "金"}
                              {element === "wood" && "木"}
                              {element === "water" && "水"}
                              {element === "fire" && "火"}
                              {element === "earth" && "土"}
                            </span>
                            <div className={styles.elementBar}>
                              <div
                                className={styles.elementBarFill}
                                style={{ width: `${(value as number) * 100}%` }}
                              />
                            </div>
                            <span className={styles.elementValue}>
                              {Math.round((value as number) * 100)}%
                            </span>
                          </div>
                        ))
                      : ["金", "木", "水", "火", "土"].map((el, idx) => (
                          <div key={el} className={styles.fiveElementItem}>
                            <span className={styles.elementName}>{el}</span>
                            <div className={styles.elementBar}>
                              <div
                                className={styles.elementBarFill}
                                style={{ width: "20%" }}
                              />
                            </div>
                            <span className={styles.elementValue}>20%</span>
                          </div>
                        ))}
                  </div>
                </div>
              </div>

              {/* 初步推断 */}
              <div className={`${styles.card} ${styles.inferCard}`}>
                <div className="card-header">
                  <span className="card-title">初步推断</span>
                </div>
                <ul className={styles.inferList}>
                  {keywords.map((keyword, index) => (
                    <li key={index} className={styles.inferItem}>
                      <span className={styles.inferDot} />
                      {keyword}
                    </li>
                  ))}
                </ul>
                <p className={styles.inferDesc}>{interpretation}</p>
              </div>

              {/* 当前不确定项 */}
              <div className={`${styles.card} ${styles.uncertaintyCard}`}>
                <div className="card-header">
                  <span className="card-title">当前不确定项</span>
                  <span className="tag tag-warning">待校准</span>
                </div>
                <ul className={styles.uncertaintyList}>
                  {uncertainty.map((item, index) => (
                    <li key={index} className={styles.uncertaintyItem}>
                      <span className={styles.uncertaintyIcon}>?</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 右侧辅助 */}
            <div className={styles.sidebar}>
              <div className={styles.sidebarCard}>
                <h3 className={styles.sidebarTitle}>证据来源</h3>
                <ul className={styles.sourceList}>
                  <li className={styles.sourceItem}>
                    <span
                      className={styles.sourceDot}
                      style={{ background: "var(--accent-gold)" }}
                    />
                    八字分析
                  </li>
                  <li className={styles.sourceItem}>
                    <span
                      className={styles.sourceDot}
                      style={{ background: "var(--text-muted)" }}
                    />
                    面相分析（未完成）
                  </li>
                  <li className={styles.sourceItem}>
                    <span
                      className={styles.sourceDot}
                      style={{ background: "var(--text-muted)" }}
                    />
                    手相分析（未完成）
                  </li>
                  <li className={styles.sourceItem}>
                    <span
                      className={styles.sourceDot}
                      style={{ background: "var(--text-muted)" }}
                    />
                    问答记录（未开始）
                  </li>
                </ul>
              </div>

              <div className={styles.sidebarCard}>
                <h3 className={styles.sidebarTitle}>下一步</h3>
                <p className={styles.sidebarText}>
                  补充更多信息，系统将逐步提高置信度
                </p>
                <div className={styles.nextActions}>
                  <Link href="/onboarding" className={styles.nextAction}>
                    补充基本信息
                  </Link>
                  <Link href="/questionnaire" className={styles.nextAction}>
                    开始问答
                  </Link>
                </div>
              </div>

              <div className={styles.sidebarCard}>
                <h3 className={styles.sidebarTitle}>置信度说明</h3>
                <p className={styles.sidebarText}>
                  当前置信度 {overallScore}
                  %，系统认为画像基础框架已建立，但细节仍需校准。
                </p>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className={styles.footerAction}>
            <Link href="/questionnaire" className="btn btn-primary">
              回答下一组问题，继续校准画像
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
