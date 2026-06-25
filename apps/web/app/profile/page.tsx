"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../components/Navigation";
import {
  fetchCurrentProfile,
  fetchProfileVersions,
  fetchProfileVersion,
  fetchArchiveChanges,
} from "@ntgm/sdk";
import type {
  ProfileSummaryResponse,
  ProfileVersionItem,
  ArchiveChangesResponse,
} from "@ntgm/sdk";
import styles from "./profile.module.css";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

// 雷达图组件
function RadarChart({ data }: { data: { label: string; value: number }[] }) {
  const size = 280;
  const center = size / 2;
  const maxRadius = 110;
  const levels = 4;

  const angleStep = (2 * Math.PI) / data.length;
  const startAngle = -Math.PI / 2;

  const getPoint = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    const radius = value * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  const polygonPoints = data
    .map((d, i) => {
      const p = getPoint(i, d.value);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <svg width={size} height={size} className={styles.radarSvg}>
      {/* 背景网格 */}
      {Array.from({ length: levels }).map((_, i) => {
        const r = maxRadius * ((i + 1) / levels);
        const points = data
          .map((_, j) => {
            const angle = startAngle + j * angleStep;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          })
          .join(" ");
        return (
          <polygon
            key={i}
            points={points}
            fill="none"
            stroke="rgba(182, 136, 61, 0.2)"
            strokeWidth="1"
          />
        );
      })}

      {/* 轴线 */}
      {data.map((_, i) => {
        const p = getPoint(i, 1);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke="rgba(182, 136, 61, 0.3)"
            strokeWidth="1"
          />
        );
      })}

      {/* 数据区域 */}
      <polygon
        points={polygonPoints}
        fill="rgba(182, 136, 61, 0.3)"
        stroke="var(--accent-gold)"
        strokeWidth="2"
      />

      {/* 数据点 */}
      {data.map((d, i) => {
        const p = getPoint(i, d.value);
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="5"
            fill="var(--accent-gold)"
            stroke="var(--bg-primary)"
            strokeWidth="2"
          />
        );
      })}

      {/* 标签 */}
      {data.map((d, i) => {
        const p = getPoint(i, 1.2);
        return (
          <text
            key={i}
            x={p.x}
            y={p.y + 5}
            textAnchor="middle"
            fill="var(--text-secondary)"
            fontSize="12"
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

export default function ProfilePage() {
  const [currentProfile, setCurrentProfile] =
    useState<ProfileSummaryResponse | null>(null);
  const [versions, setVersions] = useState<ProfileVersionItem[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number>(0);
  const [selectedProfile, setSelectedProfile] =
    useState<ProfileSummaryResponse | null>(null);
  const [activeTab, setActiveTab] = useState("bazi");
  const [selectedDimension, setSelectedDimension] = useState<string | null>(
    null
  );
  const [profileChanges, setProfileChanges] =
    useState<ArchiveChangesResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      const [profile, versionList, changes] = await Promise.all([
        fetchCurrentProfile(API_BASE_URL).catch(() => null),
        fetchProfileVersions(API_BASE_URL).catch(() => null),
        fetchArchiveChanges(API_BASE_URL).catch(() => null),
      ]);
      setCurrentProfile(profile);
      setVersions(versionList?.items || []);
      setSelectedVersion(profile?.profileVersion || 0);
      setSelectedProfile(profile);
      setProfileChanges(changes);
    };
    load();
  }, []);

  const handleVersionSelect = async (version: number) => {
    setSelectedDimension(null); // Close dimension drawer when switching versions
    setSelectedVersion(version);
    if (version === currentProfile?.profileVersion) {
      setSelectedProfile(currentProfile);
    } else {
      const p = await fetchProfileVersion(API_BASE_URL, version).catch(
        () => null
      );
      setSelectedProfile(p);
    }
  };

  // Close drawer when profile changes
  useEffect(() => {
    setSelectedDimension(null);
  }, [selectedProfile]);

  // Extract ability traits from selected profile
  const abilityTraits = selectedProfile?.abilityTraits as {
    execution?: number;
    leadership?: number;
    learning?: number;
    resourceIntegration?: number;
    strategy?: number;
  } | null;

  const abilityData = [
    { label: "执行力", value: abilityTraits?.execution ?? 0.7 },
    { label: "领导力", value: abilityTraits?.leadership ?? 0.7 },
    { label: "学习力", value: abilityTraits?.learning ?? 0.7 },
    { label: "资源整合", value: abilityTraits?.resourceIntegration ?? 0.7 },
    { label: "策略思维", value: abilityTraits?.strategy ?? 0.7 },
  ];

  // Extract personality traits
  const personalityTraits = selectedProfile?.personalityTraits as Record<
    string,
    number
  > | null;
  const confidenceMap = selectedProfile?.confidenceMap as Record<
    string,
    number
  > | null;

  const personalityEntries = personalityTraits
    ? Object.entries(personalityTraits)
    : [];

  const traitLabels: Record<string, string> = {
    introversion: "内向/外向",
    rationality: "理性/感性",
    impulsiveness: "冲动/克制",
    riskPreference: "风险偏好",
    powerDrive: "权力驱动",
    emotionStability: "情绪稳定",
    orderliness: "秩序感",
    creativity: "创造力",
  };

  // Extract summary data
  const summary = selectedProfile?.summary as {
    overallScore?: number;
    keywords?: string[];
  } | null;

  // Sort versions in descending order
  const sortedVersions = [...versions].sort(
    (a, b) => b.profileVersion - a.profileVersion
  );

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.versionBadge}>
                <span className="version-tag">V{selectedVersion}</span>
              </div>
              <div className={styles.headerInfo}>
                <h1 className={styles.title}>动态画像</h1>
                <div className={styles.scoreInfo}>
                  <span className="score-badge">
                    {summary?.overallScore ?? 85}
                  </span>
                  <span className={styles.scoreLabel}>综合评分</span>
                </div>
              </div>
            </div>
            <div className={styles.keywords}>
              {summary?.keywords?.map((kw) => (
                <span key={kw} className="tag">
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Version Selector */}
          <div className={styles.versionSelector}>
            <span className={styles.selectorLabel}>查看版本：</span>
            <div className={styles.versionButtons}>
              {sortedVersions.length > 0 ? (
                sortedVersions.map((v) => (
                  <button
                    key={v.profileVersion}
                    className={`${styles.versionButton} ${selectedVersion === v.profileVersion ? styles.active : ""}`}
                    onClick={() => handleVersionSelect(v.profileVersion)}
                  >
                    V{v.profileVersion}
                  </button>
                ))
              ) : (
                <button className={`${styles.versionButton} ${styles.active}`}>
                  V{selectedVersion || 1}
                </button>
              )}
            </div>
          </div>

          <div className={styles.content}>
            {/* 左侧：性格维度 + 雷达图 */}
            <div className={styles.leftColumn}>
              {/* 性格矩阵 */}
              <div className={`${styles.card} ${styles.personalityCard}`}>
                <div className="card-header">
                  <span className="card-title">性格维度</span>
                </div>
                <div className={styles.personalityGrid}>
                  {personalityEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className={`${styles.personalityItem} ${selectedDimension === key ? styles.selected : ""}`}
                      onClick={() =>
                        setSelectedDimension(
                          selectedDimension === key ? null : key
                        )
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        setSelectedDimension(
                          selectedDimension === key ? null : key
                        )
                      }
                    >
                      <div className={styles.personalityLabel}>
                        <span>{traitLabels[key] || key}</span>
                        <span className={styles.confidence}>
                          {Math.round((confidenceMap?.[key] || 0.5) * 100)}%
                          {(confidenceMap?.[key] || 0.5) < 0.6 && (
                            <span className={styles.lowConfidence}>⚠</span>
                          )}
                        </span>
                      </div>
                      <div className="stat-bar">
                        <div className="stat-bar-track">
                          <div
                            className="stat-bar-fill"
                            style={{
                              width: `${value * 100}%`,
                              background:
                                key === "riskPreference"
                                  ? "linear-gradient(90deg, var(--accent-gold-dark), var(--accent-red))"
                                  : "linear-gradient(90deg, var(--accent-gold-dark), var(--accent-gold))",
                            }}
                          />
                        </div>
                        <span className="stat-bar-value">
                          {Math.round(value * 100)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 能力雷达图 */}
              <div className={`${styles.card} ${styles.radarCard}`}>
                <div className="card-header">
                  <span className="card-title">能力雷达</span>
                </div>
                <div className={styles.radarContainer}>
                  <RadarChart data={abilityData} />
                </div>
              </div>
            </div>

            {/* 证据展开面板 */}
            {selectedDimension && (
              <div className={`${styles.card} ${styles.evidenceDrawer}`}>
                <div className="card-header">
                  <span className="card-title">
                    {traitLabels[selectedDimension] || selectedDimension}{" "}
                    维度详情
                  </span>
                  <button
                    className={styles.closeBtn}
                    onClick={() => setSelectedDimension(null)}
                    aria-label="关闭"
                  >
                    ×
                  </button>
                </div>
                <div className={styles.evidenceDrawerContent}>
                  <div className={styles.dimensionValue}>
                    <span className={styles.valueLabel}>当前值：</span>
                    <span className={styles.valueNumber}>
                      {Math.round(
                        (personalityTraits?.[selectedDimension] || 0) * 100
                      )}
                      %
                    </span>
                  </div>
                  <div className={styles.dimensionConfidence}>
                    <span className={styles.valueLabel}>置信度：</span>
                    <span
                      className={`${styles.confidenceBadge} ${
                        (confidenceMap?.[selectedDimension] || 0) >= 0.7
                          ? styles.high
                          : (confidenceMap?.[selectedDimension] || 0) >= 0.5
                            ? styles.medium
                            : styles.low
                      }`}
                    >
                      {Math.round(
                        (confidenceMap?.[selectedDimension] || 0) * 100
                      )}
                      %
                      {(confidenceMap?.[selectedDimension] || 0) < 0.6 && " ⚠️"}
                    </span>
                  </div>
                  <div className={styles.dimensionSources}>
                    <h4 className={styles.sourcesTitle}>证据来源</h4>
                    <ul className={styles.sourcesList}>
                      <li>八字分析 - 基于出生日期的命盘推算</li>
                      <li>
                        问卷回答 - 基于 {selectedDimension} 相关问题的回答
                      </li>
                      <li>人生事件 - 记录的生活事件对维度的影响</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 右侧：变化说明 + 证据来源 */}
            <div className={styles.rightColumn}>
              {/* 版本变化信息 */}
              <div className={`${styles.card} ${styles.changeCard}`}>
                <div className="card-header">
                  <span className="card-title">本次变化</span>
                  <span className="tag">
                    V{Math.max(0, selectedVersion - 1)} → V{selectedVersion}
                  </span>
                </div>
                <div className={styles.changeList}>
                  {(() => {
                    const change = profileChanges?.items?.find(
                      (item) => item.toVersion === selectedVersion
                    );
                    if (!change) {
                      return (
                        <div className={styles.changeItem}>
                          <div className={styles.changeHeader}>
                            <span className={styles.changeDimension}>
                              画像更新
                            </span>
                            <span
                              className={`${styles.changeDirection} ${styles.increase}`}
                            >
                              ↑ 更新
                            </span>
                          </div>
                          <p className={styles.changeReason}>
                            根据最新问答和生活事件更新了你的画像。
                          </p>
                        </div>
                      );
                    }
                    const raised = change.changedDimensions?.raised || [];
                    const lowered = change.changedDimensions?.lowered || [];
                    return (
                      <>
                        {raised.map((dim) => (
                          <div key={dim} className={styles.changeItem}>
                            <div className={styles.changeHeader}>
                              <span className={styles.changeDimension}>
                                {dim}
                              </span>
                              <span
                                className={`${styles.changeDirection} ${styles.increase}`}
                              >
                                ↑ 提升
                              </span>
                            </div>
                          </div>
                        ))}
                        {lowered.map((dim) => (
                          <div key={dim} className={styles.changeItem}>
                            <div className={styles.changeHeader}>
                              <span className={styles.changeDimension}>
                                {dim}
                              </span>
                              <span
                                className={`${styles.changeDirection} ${styles.decrease}`}
                              >
                                ↓ 下降
                              </span>
                            </div>
                          </div>
                        ))}
                        {change.reasonSummary?.headline && (
                          <p className={styles.changeReason}>
                            {change.reasonSummary.headline}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* 证据来源 */}
              <div className={`${styles.card} ${styles.evidenceCard}`}>
                <div className="card-header">
                  <span className="card-title">证据来源</span>
                </div>
                <div className={styles.evidenceTabs}>
                  {[
                    { key: "bazi", label: "八字分析" },
                    { key: "qa", label: "问答记录" },
                    { key: "events", label: "人生事件" },
                    { key: "face", label: "面相" },
                    { key: "palm", label: "手相" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      className={`${styles.evidenceTab} ${activeTab === tab.key ? styles.active : ""}`}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className={styles.evidenceContent}>
                  <ul className={styles.evidenceList}>
                    {activeTab === "bazi" && (
                      <>
                        <li>出生日期推算八字命盘</li>
                        <li>五行强弱统计分析</li>
                        <li>十神关系分析</li>
                        <li>大运流年初步预测</li>
                      </>
                    )}
                    {activeTab === "qa" && (
                      <>
                        <li>创业风险偏好问卷回答</li>
                        <li>职业发展问答反馈</li>
                        <li>重大决策风格评估</li>
                      </>
                    )}
                    {activeTab === "events" && (
                      <>
                        <li>2025年创业经历</li>
                        <li>2024年职业转型</li>
                        <li>2023年人际关系变化</li>
                      </>
                    )}
                    {activeTab === "face" && (
                      <>
                        <li>眉眼间距分析</li>
                        <li>鼻梁挺度评估</li>
                        <li>颧骨高度测量</li>
                      </>
                    )}
                    {activeTab === "palm" && (
                      <>
                        <li>生命线连续性分析</li>
                        <li>智慧线与感情线关系</li>
                        <li>指节长度比例</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              {/* 版本历史 */}
              <div className={`${styles.card} ${styles.historyCard}`}>
                <div className="card-header">
                  <span className="card-title">演进历史</span>
                </div>
                <div className={styles.historyList}>
                  {sortedVersions.slice(0, 4).map((item) => (
                    <div
                      key={item.profileVersion}
                      className={styles.historyItem}
                    >
                      <span className="version-tag">
                        V{item.profileVersion}
                      </span>
                      <div className={styles.historyContent}>
                        <span className={styles.historyTitle}>
                          {(item.summary as { versionTitle?: string })
                            ?.versionTitle || "画像版本"}
                        </span>
                        <span className={styles.historyDate}>
                          {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
