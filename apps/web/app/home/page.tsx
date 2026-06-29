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
import { Skeleton, SkeletonCard } from "../components/Skeleton";
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
          载入中...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Workbench userName={user?.displayName ?? "客官"} />
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
      {/* Hero / 静观 */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>静观·{userName}</h1>
          <p className={styles.heroSubtitle}>
            此处是汝之命理画像静观台，万象罗列，一目可览。
          </p>
          <div className={styles.heroActions}>
            <Link href="/onboarding" className="btn btn-primary">
              {hasData ? "新立命之资" : "始立命"}
            </Link>
            <Link href="/questionnaire" className="btn btn-secondary">
              续省身
            </Link>
          </div>
        </div>
        <div className={styles.heroDecoration}>
          <div className={styles.yinYang}>
            <span>☯</span>
          </div>
        </div>
      </section>

      {/* 无画像时给新人引导 */}
      {!hasData && !loading && (
        <section className={styles.cardsSection}>
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <h2 style={{ color: "var(--accent-amber)", marginBottom: 12 }}>
              尚无画像
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: 20 }}>
              走完下述三步，系统为汝生成初版画像（V1）。
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
                壹 · 立命之资
              </Link>
              <Link href="/questionnaire" className="btn btn-secondary">
                贰 · 省身校准
              </Link>
              <Link href="/analysis" className="btn btn-ghost">
                叁 · 知己之观
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
                  <span className="card-title">今之画像</span>
                  <span className="version-tag">
                    {`v${profile.profileVersion}`}
                  </span>
                </div>
                <div className={styles.profileScore}>
                  <span className="score-badge">
                    {profileSummary?.overallScore ?? "-"}
                  </span>
                  <span className={styles.scoreLabel}>综观之评</span>
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
                    label="趋避之性"
                    value={personalityTraits?.riskPreference ?? 0}
                    gradient="linear-gradient(90deg, var(--accent-amber-dark), var(--accent-cinnabar))"
                  />
                  <StatBar
                    label="长线之志"
                    value={fortuneTraits?.longTermOrientation ?? 0}
                    gradient="linear-gradient(90deg, var(--accent-jade), var(--accent-jade-light))"
                  />
                  <StatBar
                    label="静定之力"
                    value={personalityTraits?.emotionStability ?? 0}
                    gradient="linear-gradient(90deg, var(--accent-amber-dark), var(--accent-amber))"
                  />
                </div>
                <Link href="/profile" className={styles.cardLink}>
                  观其全貌 →
                </Link>
              </div>
            )}

            {/* 千古人物同炉 */}
            {match && topMatch && (
              <div className={`${styles.card} ${styles.matchCard}`}>
                <div className="card-header">
                  <span className="card-title">千古最似者</span>
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
                        神似{" "}
                        {Math.round((topMatch.similarityScore ?? 0) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
                <Link href="/match" className={styles.cardLink}>
                  览其 Top 三 →
                </Link>
              </div>
            )}

            {/* 改过之议 */}
            {advice && (
              <div className={`${styles.card} ${styles.adviceCard}`}>
                <div className="card-header">
                  <span className="card-title">改过之议</span>
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
                    : "依汝画像，示以可履之修身之议。"}
                </p>
                <Link href="/advice" className={styles.cardLink}>
                  观其全篇 →
                </Link>
              </div>
            )}

            {/* 时序之变 */}
            {timeline && timeline.items.length > 0 && (
              <div className={`${styles.card} ${styles.timelineCard}`}>
                <div className="card-header">
                  <span className="card-title">近来之变</span>
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
                  览其全程 →
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {loading && (
        <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
          <SkeletonCard rows={3} />
          <SkeletonCard rows={2} />
          <SkeletonCard rows={4} />
        </div>
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
