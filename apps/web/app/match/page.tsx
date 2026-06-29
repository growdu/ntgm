"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../components/Navigation";
import { fetchCurrentMatch } from "@ntgm/sdk";
import type { MatchCurrentResponse } from "@ntgm/sdk";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import styles from "./match.module.css";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export default function MatchPage() {
  const [match, setMatch] = useState<MatchCurrentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRank, setSelectedRank] = useState(1);

  useEffect(() => {
    fetchCurrentMatch(API_BASE_URL)
      .then(setMatch)
      .catch(() => setMatch(null))
      .finally(() => setLoading(false));
  }, []);

  const topMatches = match?.topMatches ?? [];
  const currentMatch =
    topMatches.find((m) => m.rank === selectedRank) ?? topMatches[0];

  if (loading) {
    return (
      <AppShell>
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.header}>
              <Skeleton width="220px" height="32px" />
              <div style={{ marginTop: 8 }}>
                <Skeleton width="340px" height="16px" />
              </div>
            </div>
            <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
              <SkeletonCard rows={3} />
              <SkeletonCard rows={3} />
              <SkeletonCard rows={3} />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!match || topMatches.length === 0) {
    return (
      <AppShell>
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.header}>
              <h1 className={styles.title}>千古人物同炉</h1>
              <p className={styles.subtitle}>暂无匹配结果，请先成问卷</p>
            </div>
          </div>
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
            <h1 className={styles.title}>千古人物同炉</h1>
            <p className={styles.subtitle}>
              依今之画像，系统为你匹配了最相似的千古人物
            </p>
          </div>

          <div className={styles.content}>
            {/* 左主卡片 */}
            <div className={styles.mainSection}>
              <div className={`${styles.card} ${styles.mainCard}`}>
                <div className={styles.mainCardHeader}>
                  <span className={styles.mainCardLabel}>今的你，最像：</span>
                </div>
                <div className={styles.figureDisplay}>
                  <div className={styles.figureAvatar}>
                    <span>{currentMatch?.figureName?.[0] ?? "?"}</span>
                  </div>
                  <div className={styles.figureInfo}>
                    <h2 className={styles.figureName}>
                      {currentMatch?.figureName ?? "未知"}
                    </h2>
                    <span className={styles.figureMeta}>
                      相似度{" "}
                      {Math.round((currentMatch?.similarityScore ?? 0) * 100)}%
                    </span>
                  </div>
                  <div className={styles.similarityScore}>
                    <span className="score-badge">
                      {Math.round((currentMatch?.similarityScore ?? 0) * 100)}
                    </span>
                    <span className={styles.scoreLabel}>相似度</span>
                  </div>
                </div>
              </div>

              {/* 相似的地方 */}
              <div className={`${styles.card} ${styles.similarCard}`}>
                <div className="card-header">
                  <span className="card-title">相似的地方</span>
                </div>
                <ul className={styles.pointsList}>
                  {currentMatch?.highlights?.map((point, index) => (
                    <li key={index} className={styles.pointItem}>
                      <span className={styles.pointIcon}>✓</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 不同的地方 */}
              <div className={`${styles.card} ${styles.differentCard}`}>
                <div className="card-header">
                  <span className="card-title">不同的地方</span>
                </div>
                <ul className={styles.pointsList}>
                  {currentMatch?.differences?.map((point, index) => (
                    <li key={index} className={styles.pointItem}>
                      <span className={styles.pointIconDiff}>≠</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 右候选列表 */}
            <div className={styles.sidebar}>
              <div className={styles.candidateCard}>
                <h3 className={styles.candidateTitle}>候选人物</h3>
                <div className={styles.candidateList}>
                  {topMatches.map((m) => (
                    <div
                      key={m.rank}
                      className={`${styles.candidateItem} ${selectedRank === m.rank ? styles.active : ""}`}
                      onClick={() => setSelectedRank(m.rank)}
                    >
                      <div className={styles.candidateRank}>
                        <span className={styles.rankNumber}>{m.rank}</span>
                      </div>
                      <div className={styles.candidateInfo}>
                        <span className={styles.candidateName}>
                          {m.figureName}
                        </span>
                      </div>
                      <div className={styles.candidateScore}>
                        <span className={styles.scoreValue}>
                          {Math.round(m.similarityScore * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.infoCard}>
                <h3 className={styles.infoTitle}>匹配说明</h3>
                <p className={styles.infoText}>
                  千古人物同炉依汝之画像维度（性格、能力、关系模式、命运节奏）与千古人物原型进行多维匹配。
                </p>
                <p className={styles.infoText}>
                  匹配结果会随着汝之画像演进而变。
                </p>
              </div>

              <div className={styles.infoCard}>
                <h3 className={styles.infoTitle}>为什么重要？</h3>
                <p className={styles.infoText}>了解「你像谁」可帮助你：</p>
                <ul className={styles.benefitList}>
                  <li>更清晰地理解自己的行为模式</li>
                  <li>从千古人物的成功与失败中学习</li>
                  <li>预见自己可能的人生轨迹</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
