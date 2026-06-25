"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/Navigation";
import { useAuth } from "../../lib/auth";
import { Toast } from "../components/Toast";
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
import styles from "../page.module.css";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export default function HomePage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push("/login?next=/home");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <AppShell>
        <div
          style={{
            padding: 80,
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          加载中...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Workbench userName={user?.displayName ?? "你"} />
    </AppShell>
  );
}

function Workbench({ userName }: { userName: string }) {
  const [profile, setProfile] = useState<ProfileSummaryResponse | null>(null);
  const [match, setMatch] = useState<MatchCurrentResponse | null>(null);
  const [advice, setAdvice] = useState<AdviceCurrentResponse | null>(null);
  const [timeline, setTimeline] = useState<ArchiveTimelineResponse | null>(
    null
  );
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
  const profileSummary = profile?.summary as
    | { keywords?: string[]; overallScore?: number }
    | undefined;
  const personalityTraits = (profile?.personalityTraits ?? {}) as Record<
    string,
    number
  >;
  const fortuneTraits = (profile?.fortuneTraits ?? {}) as Record<
    string,
    number
  >;

  const hasData = !!(profile || match || advice);

  return (
    <div className={styles.page}>
      {/* Hero / 欢迎 */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>欢迎回来，{userName}</h1>
          <p className={styles.heroSubtitle}>
            这里是你的命运画像工作台，所有数据一目了然。
          </p>
          <div className={styles.heroActions}>
            <Link href="/onboarding" className="btn btn-primary">
              {hasData ? "更新基础资料" : "开始建档"}
            </Link>
            <Link href="/questionnaire" className="btn btn-secondary">
              继续问答
            </Link>
          </div>
        </div>
        <div className={styles.heroDecoration}>
          <div className={styles.yinYang}>
            <span>☯</span>
          </div>
        </div>
      </section>

      {/* 没有数据时给新手引导 */}
      {!hasData && !loading && (
        <section className={styles.cardsSection}>
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <h2 style={{ color: "var(--accent-gold)", marginBottom: 12 }}>
              还没有画像数据
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: 20 }}>
              完成下面 3 步，系统会为你生成初始画像 V1。
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link href="/onboarding" className="btn btn-primary">
                1. 基础建档
              </Link>
              <Link href="/questionnaire" className="btn btn-secondary">
                2. 回答校准问答
              </Link>
              <Link href="/analysis" className="btn btn-ghost">
                3. 查看初始分析
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 数据看板 */}
      {hasData && (
        <section className={styles.cardsSection}>
          <div className={styles.cardsGrid}>
            {/* 画像摘要 */}
            {profile && (
              <div className={`${styles.card} ${styles.profileCard}`}>
                <div className="card-header">
                  <span className="card-title">当前画像</span>
                  <span className="version-tag">
                    {`v${profile.profileVersion}`}
                  </span>
                </div>
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
                  <StatBar
                    label="风险偏好"
                    value={personalityTraits?.riskPreference ?? 0}
                    gradient="linear-gradient(90deg, var(--accent-gold-dark), var(--accent-red))"
                  />
                  <StatBar
                    label="长线主义"
                    value={fortuneTraits?.longTermOrientation ?? 0}
                    gradient="linear-gradient(90deg, var(--accent-jade), var(--accent-jade-light))"
                  />
                  <StatBar
                    label="情绪稳定"
                    value={personalityTraits?.emotionStability ?? 0}
                    gradient="linear-gradient(90deg, var(--accent-gold-dark), var(--accent-gold))"
                  />
                </div>
                <Link href="/profile" className={styles.cardLink}>
                  查看完整画像 →
                </Link>
              </div>
            )}

            {/* 历史人物匹配 */}
            {match && topMatch && (
              <div className={`${styles.card} ${styles.matchCard}`}>
                <div className="card-header">
                  <span className="card-title">最像的历史人物</span>
                </div>
                <div className={styles.matchMain}>
                  <div className={styles.matchFigure}>
                    <div className={styles.figureAvatar}>
                      <span>{topMatch.figureName[0]}</span>
                    </div>
                    <div className={styles.figureInfo}>
                      <div className={styles.figureName}>
                        {topMatch.figureName}
                      </div>
                      <div className={styles.figureEra}>
                        相似度{" "}
                        {Math.round((topMatch.similarityScore ?? 0) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
                <Link href="/match" className={styles.cardLink}>
                  查看 Top 3 →
                </Link>
              </div>
            )}

            {/* 改命建议 */}
            {advice && (
              <div className={`${styles.card} ${styles.adviceCard}`}>
                <div className="card-header">
                  <span className="card-title">改命建议</span>
                </div>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.92rem",
                    lineHeight: 1.7,
                  }}
                >
                  {typeof advice.summary === "object" &&
                  advice.summary &&
                  "headline" in advice.summary
                    ? String((advice.summary as { headline: string }).headline)
                    : "根据你的画像，我们生成了个性化的改命建议。"}
                </p>
                <Link href="/advice" className={styles.cardLink}>
                  查看完整建议 →
                </Link>
              </div>
            )}

            {/* 时间线 */}
            {timeline && timeline.items.length > 0 && (
              <div className={`${styles.card} ${styles.timelineCard}`}>
                <div className="card-header">
                  <span className="card-title">最近变化</span>
                </div>
                <div className={styles.timelineList}>
                  {timeline.items.slice(0, 3).map((evt, idx) => (
                    <div
                      key={`${evt.title}-${idx}`}
                      className={styles.timelineItem}
                    >
                      <span className={styles.timelineDate}>
                        {new Date(evt.occurredAt).toLocaleDateString("zh-CN")}
                      </span>
                      <span className={styles.timelineType}>
                        {evt.itemType}
                      </span>
                    </div>
                  ))}
                </div>
                <Link href="/archive" className={styles.cardLink}>
                  查看完整时间线 →
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {loading && (
        <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
          加载数据中...
        </p>
      )}
    </div>
  );
}

function StatBar({
  label,
  value,
  gradient,
}: {
  label: string;
  value: number;
  gradient: string;
}) {
  return (
    <div className="stat-bar">
      <span className="stat-bar-label">{label}</span>
      <div className="stat-bar-track">
        <div
          className="stat-bar-fill"
          style={{ width: `${value * 100}%`, background: gradient }}
        />
      </div>
      <span className="stat-bar-value">{Math.round(value * 100)}</span>
    </div>
  );
}
