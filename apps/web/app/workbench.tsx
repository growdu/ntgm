"use client";

import {
  ApiError,
  fetchCurrentAdvice,
  fetchCurrentBazi,
  fetchCurrentMatch,
  fetchCurrentProfile,
  fetchCurrentUser,
  fetchHealth,
  fetchIntakeRecords,
  recomputeProfile,
  submitBasicIntake,
  type AdviceCurrentResponse,
  type BaziCurrentResponse,
  type HealthResponse,
  type IntakeRecordItem,
  type MatchCurrentResponse,
  type ProfileSummaryResponse,
  type UserMeResponse
} from "@ntgm/sdk";
import { startTransition, useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

const INITIAL_FORM = {
  name: "",
  gender: "female",
  birthDatetime: "",
  birthPlace: ""
};

type DashboardState = {
  health: HealthResponse | null;
  user: UserMeResponse | null;
  records: IntakeRecordItem[];
  bazi: BaziCurrentResponse | null;
  profile: ProfileSummaryResponse | null;
  match: MatchCurrentResponse | null;
  advice: AdviceCurrentResponse | null;
};

async function optionalRequest<T>(loader: () => Promise<T>): Promise<T | null> {
  try {
    return await loader();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "未填写";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function prettyValue(value: unknown): string {
  if (value === undefined) {
    return "undefined";
  }

  return JSON.stringify(value, null, 2);
}

function cardStyle(emphasis = false): CSSProperties {
  return {
    border: emphasis ? "1px solid rgba(208, 173, 102, 0.5)" : "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: 24,
    padding: 24,
    background: emphasis ? "rgba(52, 37, 14, 0.42)" : "rgba(13, 18, 28, 0.72)",
    boxShadow: emphasis ? "0 20px 50px rgba(0, 0, 0, 0.28)" : "0 16px 40px rgba(0, 0, 0, 0.18)",
    backdropFilter: "blur(12px)"
  };
}

function SectionCard({
  title,
  eyebrow,
  children,
  emphasis = false
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <section style={cardStyle(emphasis)}>
      <p style={{ margin: 0, color: "#c9a96a", letterSpacing: "0.16em", fontSize: 12 }}>{eyebrow}</p>
      <h2 style={{ margin: "10px 0 18px", fontSize: 26 }}>{title}</h2>
      {children}
    </section>
  );
}

function KeyValueList({ items }: { items: Array<{ label: string; value: string | number }> }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 14
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            borderRadius: 18,
            padding: 16,
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.06)"
          }}
        >
          <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 8 }}>{item.label}</div>
          <div style={{ fontSize: 16, lineHeight: 1.5 }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function IntakeWorkbench() {
  const [dashboard, setDashboard] = useState<DashboardState>({
    health: null,
    user: null,
    records: [],
    bazi: null,
    profile: null,
    match: null,
    advice: null
  });
  const [form, setForm] = useState(INITIAL_FORM);
  const [statusText, setStatusText] = useState("等待首次建档。");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  async function loadDashboard() {
    setErrorText(null);

    const health = await fetchHealth(API_BASE_URL);
    const user = await optionalRequest(() => fetchCurrentUser(API_BASE_URL));

    if (user === null) {
      setDashboard({
        health,
        user: null,
        records: [],
        bazi: null,
        profile: null,
        match: null,
        advice: null
      });
      return;
    }

    const [records, bazi, profile, match, advice] = await Promise.all([
      fetchIntakeRecords(API_BASE_URL),
      optionalRequest(() => fetchCurrentBazi(API_BASE_URL)),
      optionalRequest(() => fetchCurrentProfile(API_BASE_URL)),
      optionalRequest(() => fetchCurrentMatch(API_BASE_URL)),
      optionalRequest(() => fetchCurrentAdvice(API_BASE_URL))
    ]);

    setDashboard({
      health,
      user,
      records,
      bazi,
      profile,
      match,
      advice
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        await loadDashboard();
      } catch (error) {
        if (!cancelled) {
          setErrorText(error instanceof Error ? error.message : "加载失败");
        }
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshDashboard(message?: string) {
    startTransition(() => {
      setStatusText(message ?? "正在刷新画像数据...");
    });

    try {
      await loadDashboard();
      setStatusText(message ?? "画像数据已刷新。");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "刷新失败");
    }
  }

  async function handleSubmitIntake(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorText(null);

    if (!form.birthDatetime) {
      setErrorText("请填写出生时间。");
      return;
    }

    setIsBusy(true);

    try {
      const result = await submitBasicIntake(API_BASE_URL, {
        ...form,
        birthDatetime: new Date(form.birthDatetime).toISOString()
      });
      await loadDashboard();
      setStatusText(`建档已提交，下一步：${result.nextAction}`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "建档失败");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRecompute() {
    setErrorText(null);

    setIsBusy(true);

    try {
      const job = await recomputeProfile(API_BASE_URL, "web_dashboard_refresh");
      await loadDashboard();
      setStatusText(`画像重算完成，任务状态：${job.status}`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "重算失败");
    } finally {
      setIsBusy(false);
    }
  }

  const summaryItems = [
    {
      label: "接口健康",
      value: dashboard.health?.data.status ?? "未知"
    },
    {
      label: "当前画像版本",
      value: dashboard.profile?.profileVersion ?? 0
    },
    {
      label: "证据条目数",
      value: dashboard.records.length
    },
    {
      label: "八字评分",
      value: dashboard.bazi?.score ?? "未生成"
    }
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "56px 20px 96px",
        background:
          "radial-gradient(circle at top, rgba(199, 156, 77, 0.22), transparent 24%), linear-gradient(180deg, #0b0d12 0%, #101723 100%)"
      }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <section
          style={{
            ...cardStyle(true),
            padding: "32px clamp(24px, 4vw, 40px)",
            marginBottom: 24
          }}
        >
          <p style={{ margin: 0, color: "#c9a96a", letterSpacing: "0.18em", fontSize: 12 }}>
            NTGM / PROFILE WORKBENCH
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
              alignItems: "end"
            }}
          >
            <div>
              <h1 style={{ fontSize: "clamp(38px, 6vw, 72px)", lineHeight: 1.02, margin: "14px 0 18px" }}>
                持续校准的命理画像工作台
              </h1>
              <p style={{ margin: 0, color: "#ddd6c5", lineHeight: 1.9, fontSize: 17, maxWidth: 760 }}>
                这不是一次性出报告的页面，而是一个会随着用户输入、人生事件和问答证据不断修正结论的画像引擎。
                当前页面已经串起建档、八字占位、画像重算、历史人物匹配和建议查看的最小链路。
              </p>
            </div>
            <div
              style={{
                padding: 18,
                borderRadius: 22,
                background: "rgba(0, 0, 0, 0.18)",
                border: "1px solid rgba(255, 255, 255, 0.08)"
              }}
            >
              <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 6 }}>当前状态</div>
              <div style={{ fontSize: 16, lineHeight: 1.7 }}>{statusText}</div>
              <div style={{ marginTop: 14, color: errorText ? "#f8b4b4" : "#9ca3af", lineHeight: 1.6 }}>
                {errorText ?? "接口可用后，这里会持续反馈当前动作。"}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 24 }}>
            <KeyValueList items={summaryItems} />
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 24
          }}
        >
          <div style={{ display: "grid", gap: 24, alignContent: "start" }}>
            <SectionCard title="基础建档" eyebrow="INTAKE">
              <form onSubmit={handleSubmitIntake} style={{ display: "grid", gap: 14 }}>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ color: "#d4d4d8" }}>姓名</span>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="输入姓名"
                    style={inputStyle}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ color: "#d4d4d8" }}>性别</span>
                  <select
                    value={form.gender}
                    onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))}
                    style={inputStyle}
                  >
                    <option value="female">女</option>
                    <option value="male">男</option>
                    <option value="other">其他</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ color: "#d4d4d8" }}>出生时间</span>
                  <input
                    type="datetime-local"
                    value={form.birthDatetime}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, birthDatetime: event.target.value }))
                    }
                    style={inputStyle}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ color: "#d4d4d8" }}>出生地点</span>
                  <input
                    value={form.birthPlace}
                    onChange={(event) => setForm((current) => ({ ...current, birthPlace: event.target.value }))}
                    placeholder="如：浙江杭州"
                    style={inputStyle}
                  />
                </label>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
                  <button type="submit" style={primaryButtonStyle} disabled={isBusy}>
                    {isBusy ? "处理中..." : "提交建档"}
                  </button>
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={() => void refreshDashboard("正在同步当前状态...")}
                    disabled={isBusy}
                  >
                    刷新数据
                  </button>
                </div>
              </form>
            </SectionCard>

            <SectionCard title="当前档案" eyebrow="USER">
              {dashboard.user ? (
                <KeyValueList
                  items={[
                    { label: "姓名", value: dashboard.user.name ?? "未填写" },
                    { label: "性别", value: dashboard.user.gender ?? "未填写" },
                    { label: "出生时间", value: formatDateTime(dashboard.user.birthDatetime) },
                    { label: "出生地点", value: dashboard.user.birthPlace ?? "未填写" }
                  ]}
                />
              ) : (
                <EmptyState text="当前还没有用户档案，先提交基础建档。" />
              )}
            </SectionCard>

            <SectionCard title="证据链" eyebrow="INTAKE RECORDS">
              {dashboard.records.length > 0 ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {dashboard.records.map((record) => (
                    <div
                      key={record.recordId}
                      style={{
                        borderRadius: 18,
                        padding: 16,
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.06)"
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "center",
                          marginBottom: 12
                        }}
                      >
                        <strong>{record.intakeType}</strong>
                        <span style={{ color: "#9ca3af", fontSize: 12 }}>
                          {formatDateTime(record.submittedAt)}
                        </span>
                      </div>
                      <pre style={preStyle}>{prettyValue(record.payload)}</pre>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="还没有证据条目，建档或问答后会出现在这里。" />
              )}
            </SectionCard>
          </div>

          <div style={{ display: "grid", gap: 24, alignContent: "start" }}>
            <SectionCard title="画像引擎" eyebrow="PROFILE" emphasis>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
                <button type="button" style={primaryButtonStyle} onClick={() => void handleRecompute()} disabled={isBusy}>
                  {isBusy ? "重算中..." : "重算画像"}
                </button>
              </div>
              {dashboard.profile ? (
                <div style={{ display: "grid", gap: 16 }}>
                  <KeyValueList
                    items={[
                      { label: "画像版本", value: dashboard.profile.profileVersion },
                      { label: "引擎版本", value: dashboard.profile.engineVersion },
                      {
                        label: "置信度维度数",
                        value: Object.keys(dashboard.profile.confidenceMap).length
                      }
                    ]}
                  />
                  <InfoBlock title="画像摘要" value={dashboard.profile.summary} />
                  <InfoBlock title="性格特征" value={dashboard.profile.personalityTraits} />
                  <InfoBlock title="能力特征" value={dashboard.profile.abilityTraits} />
                  <InfoBlock title="关系特征" value={dashboard.profile.relationshipTraits} />
                  <InfoBlock title="运势特征" value={dashboard.profile.fortuneTraits} />
                </div>
              ) : (
                <EmptyState text="画像还未生成。提交建档后点击“重算画像”即可产出第一版用户画像。" />
              )}
            </SectionCard>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 24
              }}
            >
              <SectionCard title="八字占位分析" eyebrow="BAZI">
                {dashboard.bazi ? (
                  <div style={{ display: "grid", gap: 14 }}>
                    <KeyValueList
                      items={[
                        { label: "年柱", value: dashboard.bazi.chart.yearGz },
                        { label: "月柱", value: dashboard.bazi.chart.monthGz },
                        { label: "日柱", value: dashboard.bazi.chart.dayGz },
                        { label: "时柱", value: dashboard.bazi.chart.hourGz },
                        { label: "评分", value: dashboard.bazi.score },
                        { label: "置信度", value: dashboard.bazi.confidence.toFixed(2) }
                      ]}
                    />
                    <InfoBlock title="特征数据" value={dashboard.bazi.featureData} />
                  </div>
                ) : (
                  <EmptyState text="建档后会自动生成最小八字占位分析。" />
                )}
              </SectionCard>

              <SectionCard title="历史人物匹配" eyebrow="MATCH">
                {dashboard.match ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    {dashboard.match.topMatches.map((item) => (
                      <div
                        key={`${item.rank}-${item.figureName}`}
                        style={{
                          borderRadius: 18,
                          padding: 16,
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid rgba(255, 255, 255, 0.06)"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                          <strong>
                            #{item.rank} {item.figureName}
                          </strong>
                          <span style={{ color: "#c9a96a" }}>{item.similarityScore.toFixed(1)}%</span>
                        </div>
                        <div style={{ color: "#d4d4d8", lineHeight: 1.7 }}>
                          相似点：{item.highlights.join("、") || "暂无"}
                        </div>
                        <div style={{ color: "#9ca3af", lineHeight: 1.7, marginTop: 6 }}>
                          差异点：{item.differences.join("、") || "暂无"}
                        </div>
                      </div>
                    ))}
                    <InfoBlock title="匹配解释" value={dashboard.match.explanation} />
                  </div>
                ) : (
                  <EmptyState text="画像生成后，这里会返回当前最像的历史人物排行。" />
                )}
              </SectionCard>
            </div>

            <SectionCard title="改命建议" eyebrow="ADVICE">
              {dashboard.advice ? (
                <InfoBlock title="当前建议摘要" value={dashboard.advice.summary} />
              ) : (
                <EmptyState text="建议依赖当前画像和匹配结果，重算画像后会生成。" />
              )}
            </SectionCard>
          </div>
        </div>

        {isInitialLoading ? (
          <div style={{ marginTop: 24, color: "#9ca3af", textAlign: "center" }}>正在加载工作台...</div>
        ) : null}
      </div>
    </main>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 18,
        color: "#9ca3af",
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px dashed rgba(255, 255, 255, 0.08)",
        lineHeight: 1.8
      }}
    >
      {text}
    </div>
  );
}

function InfoBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 8 }}>{title}</div>
      <pre style={preStyle}>{prettyValue(value)}</pre>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid rgba(255, 255, 255, 0.08)",
  background: "rgba(255, 255, 255, 0.04)",
  color: "#f3ead7",
  padding: "14px 16px",
  fontSize: 15,
  outline: "none"
};

const primaryButtonStyle: CSSProperties = {
  border: "none",
  borderRadius: 999,
  padding: "14px 22px",
  background: "linear-gradient(135deg, #d6aa61 0%, #8f6731 100%)",
  color: "#16120b",
  fontWeight: 700,
  cursor: "pointer"
};

const secondaryButtonStyle: CSSProperties = {
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 999,
  padding: "14px 22px",
  background: "rgba(255, 255, 255, 0.04)",
  color: "#f3ead7",
  fontWeight: 600,
  cursor: "pointer"
};

const preStyle: CSSProperties = {
  margin: 0,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontSize: 13,
  lineHeight: 1.7,
  color: "#ddd6c5",
  borderRadius: 16,
  padding: 14,
  background: "rgba(0, 0, 0, 0.18)",
  border: "1px solid rgba(255, 255, 255, 0.05)"
};
