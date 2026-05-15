"use client";

import Link from "next/link";
import { AppShell } from "./components/Navigation";
import {
  fetchCurrentProfile,
  fetchCurrentMatch,
  fetchCurrentAdvice,
  fetchArchiveTimeline,
} from "@ntgm/sdk";
import type {
  ProfileSummaryResponse,
  MatchCurrentResponse,
  AdviceCurrentResponse,
  ArchiveTimelineResponse,
} from "@ntgm/sdk";
import { useEffect, useState } from "react";
import styles from "./page.module.css";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export default function HomePage() {
  const [profile, setProfile] = useState<ProfileSummaryResponse | null>(null);
  const [match, setMatch] = useState<MatchCurrentResponse | null>(null);
  const [advice, setAdvice] = useState<AdviceCurrentResponse | null>(null);
  const [timeline, setTimeline] = useState<ArchiveTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [p, m, a, t] = await Promise.all([
        fetchCurrentProfile(API_BASE_URL).catch(() => null),
        fetchCurrentMatch(API_BASE_URL).catch(() => null),
        fetchCurrentAdvice(API_BASE_URL).catch(() => null),
        fetchArchiveTimeline(API_BASE_URL, { limit: 5 }).catch(() => null),
      ]);
      setProfile(p);
      setMatch(m);
      setAdvice(a);
      setTimeline(t);
      setLoading(false);
    };
    load();
  }, []);

  const topMatch = match?.topMatches?.[0];
  const profileSummary = profile?.summary as {
    keywords?: string[];
    overallScore?: number;
  } | undefined;
  const personalityTraits = profile?.personalityTraits as Record<string, number>;
  const fortuneTraits = profile?.fortuneTraits as Record<string, number>;

  return (
    <AppShell>
      <div className={styles.page}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              你的命，不止能算，还能被持续校正
            </h1>
            <p className={styles.heroSubtitle}>
              从出生信息、照片、经历到性格模式，逐步形成你的命运画像
            </p>
            <div className={styles.heroActions}>
              <Link href="/onboarding" className="btn btn-primary">
                开始建档
              </Link>
              <Link href="/profile" className="btn btn-secondary">
                查看当前画像
              </Link>
            </div>
          </div>
          <div className={styles.heroDecoration}>
            <div className={styles.yinYang}>
              <span>☯</span>
            </div>
          </div>
        </section>

        {/* Cards Section */}
        <section className={styles.cardsSection}>
          <div className={styles.cardsGrid}>
            {/* 当前画像摘要 */}
            <div className={`${styles.card} ${styles.profileCard}`}>
              <div className="card-header">
                <span className="card-title">当前画像摘要</span>
                <span className="version-tag">
                  {loading ? "..." : profile ? `v${profile.profileVersion}` : "无数据"}
                </span>
              </div>
              {profile ? (
                <>
                  <div className={styles.profileScore}>
                    <span className="score-badge">
                      {profileSummary?.overallScore ?? "-"}
                    </span>
                    <span className={styles.scoreLabel}>综合评分</span>
                  </div>
                  <div className={styles.keywords}>
                    {(profileSummary?.keywords ?? []).map((kw) => (
                      <span key={kw} className="tag">
                        {kw}
                      </span>
                    ))}
                  </div>
                  <div className={styles.statBars}>
                    <div className="stat-bar">
                      <span className="stat-bar-label">风险偏好</span>
                      <div className="stat-bar-track">
                        <div
                          className="stat-bar-fill"
                          style={{
                            width: `${(personalityTraits?.riskPreference ?? 0) * 100}%`,
                            background: "linear-gradient(90deg, var(--accent-gold-dark), var(--accent-red))",
                          }}
                        />
                      </div>
                      <span className="stat-bar-value">
                        {Math.round((personalityTraits?.riskPreference ?? 0) * 100)}
                      </span>
                    </div>
                    <div className="stat-bar">
                      <span className="stat-bar-label">长线主义</span>
                      <div className="stat-bar-track">
                        <div
                          className="stat-bar-fill"
                          style={{
                            width: `${(fortuneTraits?.longTermOrientation ?? 0) * 100}%`,
                            background: "linear-gradient(90deg, var(--accent-jade), var(--accent-jade-light))",
                          }}
                        />
                      </div>
                      <span className="stat-bar-value">
                        {Math.round((fortuneTraits?.longTermOrientation ?? 0) * 100)}
                      </span>
                    </div>
                    <div className="stat-bar">
                      <span className="stat-bar-label">情绪稳定</span>
                      <div className="stat-bar-track">
                        <div
                          className="stat-bar-fill"
                          style={{
                            width: `${(personalityTraits?.emotionStability ?? 0) * 100}%`,
                            background: "linear-gradient(90deg, var(--accent-gold-dark), var(--accent-gold))",
                          }}
                        />
                      </div>
                      <span className="stat-bar-value">
                        {Math.round((personalityTraits?.emotionStability ?? 0) * 100)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.emptyState}>
                  <p>暂无画像数据</p>
                </div>
              )}
              <Link href="/profile" className={styles.cardLink}>
                查看完整画像 →
              </Link>
            </div>

            {/* 历史人物匹配 */}
            <div className={`${styles.card} ${styles.matchCard}`}>
              <div className="card-header">
                <span className="card-title">最像的历史人物</span>
              </div>
              {topMatch ? (
                <>
                  <div className={styles.matchMain}>
                    <div className={styles.matchFigure}>
                      <div className={styles.figureAvatar}>
                        <span>{topMatch.figureName[0]}</span>
                      </div>
                      <div className={styles.figureInfo}>
                        <h3 className={styles.figureName}>{topMatch.figureName}</h3>
                      </div>
                    </div>
                    <div className={styles.similarityScore}>
                      <span className="score-badge">
                        {Math.round(topMatch.similarityScore * 100)}
                      </span>
                      <span className={styles.scoreLabel}>相似度</span>
                    </div>
                  </div>
                  <div className={styles.similarityPoints}>
                    <p className={styles.similarityLabel}>相似点：</p>
                    <ul className={styles.pointsList}>
                      {topMatch.highlights.slice(0, 2).map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <div className={styles.emptyState}>
                  <p>暂无匹配数据</p>
                </div>
              )}
              <Link href="/match" className={styles.cardLink}>
                查看详细匹配 →
              </Link>
            </div>

            {/* 今日建议 */}
            <div className={`${styles.card} ${styles.adviceCard}`}>
              <div className="card-header">
                <span className="card-title">今日建议</span>
                {advice && (
                  <span className="tag tag-warning">宜</span>
                )}
              </div>
              {advice ? (
                <div className={styles.adviceContent}>
                  {(() => {
                    const adviceSummary = advice.summary as {
                      content?: string;
                      reason?: string;
                      type?: string;
                    } | undefined;
                    return (
                      <>
                        <p className={styles.adviceText}>
                          {adviceSummary?.content ?? "暂无建议内容"}
                        </p>
                        <p className={styles.adviceReason}>
                          <span className={styles.reasonLabel}>原因：</span>
                          {adviceSummary?.reason ?? ""}
                        </p>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <p>暂无建议数据</p>
                </div>
              )}
              <div className={styles.adviceActions}>
                <Link href="/advice" className="btn btn-primary">
                  去执行
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 最近演进 */}
        <section className={styles.evolutionSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>最近演进</h2>
            <Link href="/archive" className={styles.sectionLink}>
              查看完整时间线 →
            </Link>
          </div>
          <div className={styles.evolutionTimeline}>
            {timeline?.items && timeline.items.length > 0 ? (
              timeline.items.map((item, index) => (
                <div key={item.occurredAt} className={styles.evolutionItem}>
                  <div className={styles.evolutionDot}>
                    <span className="version-tag">
                      {item.profileVersion ? `v${item.profileVersion}` : "?"}
                    </span>
                  </div>
                  <div className={styles.evolutionContent}>
                    <div className={styles.evolutionMeta}>
                      <span className={styles.evolutionDate}>
                        {new Date(item.occurredAt).toLocaleDateString("zh-CN")}
                      </span>
                      <span className={styles.evolutionTitle}>{item.title}</span>
                    </div>
                    <p className={styles.evolutionDesc}>{item.summary}</p>
                  </div>
                  {index < timeline.items.length - 1 && (
                    <div className={styles.evolutionLine} />
                  )}
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <p>暂无演进记录</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}