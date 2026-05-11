"use client";

import {
  ApiError,
  createLifeEvent,
  fetchArchiveChanges,
  fetchArchiveTimeline,
  fetchCurrentAdvice,
  fetchCurrentBazi,
  fetchCurrentMatch,
  fetchCurrentProfile,
  fetchProfileVersion,
  fetchCurrentUser,
  fetchHealth,
  fetchIntakeRecords,
  fetchLifeEvents,
  fetchNextQuestions,
  fetchProfileVersions,
  recomputeProfile,
  submitBasicIntake,
  submitQuestionnaireAnswers,
  type AdviceCurrentResponse,
  type ArchiveTimelineItem,
  type BaziCurrentResponse,
  type HealthResponse,
  type IntakeRecordItem,
  type LifeEventItem,
  type MatchCurrentResponse,
  type ProfileChangeLogItem,
  type ProfileSummaryResponse,
  type ProfileVersionItem,
  type QuestionnaireQuestion,
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

const INITIAL_EVENT_FORM = {
  eventType: "career_change",
  eventTime: "",
  title: "",
  description: "",
  impactScore: "70"
};

const TIMELINE_FILTERS = [
  { value: "profile_version", label: "画像版本" },
  { value: "profile_change", label: "版本变化" },
  { value: "life_event", label: "人生事件" },
  { value: "match_result", label: "人物匹配" },
  { value: "advice_plan", label: "建议更新" }
] as const;

type DashboardState = {
  health: HealthResponse | null;
  user: UserMeResponse | null;
  records: IntakeRecordItem[];
  events: LifeEventItem[];
  bazi: BaziCurrentResponse | null;
  profile: ProfileSummaryResponse | null;
  profileVersions: ProfileVersionItem[];
  changes: ProfileChangeLogItem[];
  timeline: ArchiveTimelineItem[];
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
    events: [],
    bazi: null,
    profile: null,
    profileVersions: [],
    changes: [],
    timeline: [],
    match: null,
    advice: null
  });
  const [form, setForm] = useState(INITIAL_FORM);
  const [eventForm, setEventForm] = useState(INITIAL_EVENT_FORM);
  const [questions, setQuestions] = useState<QuestionnaireQuestion[]>([]);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, string>>({});
  const [statusText, setStatusText] = useState("等待首次建档。");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [selectedTimelineTypes, setSelectedTimelineTypes] = useState<string[]>([]);
  const [timelineProfileFilter, setTimelineProfileFilter] = useState<number | null>(null);
  const [expandedTimelineItemKey, setExpandedTimelineItemKey] = useState<string | null>(null);
  const [selectedProfilePreview, setSelectedProfilePreview] = useState<ProfileSummaryResponse | null>(null);
  const [selectedProfilePreviewVersion, setSelectedProfilePreviewVersion] = useState<number | null>(null);

  async function loadArchiveTimeline(options?: {
    types?: string[];
    profileVersion?: number | null;
  }): Promise<ArchiveTimelineItem[]> {
    const timeline = await optionalRequest(() =>
      fetchArchiveTimeline(API_BASE_URL, {
        limit: 20,
        types: options?.types ?? selectedTimelineTypes,
        profileVersion: options?.profileVersion ?? timelineProfileFilter
      })
    );
    return timeline?.items ?? [];
  }

  async function loadDashboard() {
    setErrorText(null);

    const [health, questionnaire] = await Promise.all([
      fetchHealth(API_BASE_URL),
      fetchNextQuestions(API_BASE_URL)
    ]);
    setQuestions(questionnaire.questions);
    const user = await optionalRequest(() => fetchCurrentUser(API_BASE_URL));

    if (user === null) {
      setDashboard({
        health,
        user: null,
        records: [],
        events: [],
        bazi: null,
        profile: null,
        profileVersions: [],
        changes: [],
        timeline: [],
        match: null,
        advice: null
      });
      return;
    }

    const [records, events, bazi, profile, profileVersions, changes, timeline, match, advice] = await Promise.all([
      fetchIntakeRecords(API_BASE_URL),
      fetchLifeEvents(API_BASE_URL),
      optionalRequest(() => fetchCurrentBazi(API_BASE_URL)),
      optionalRequest(() => fetchCurrentProfile(API_BASE_URL)),
      optionalRequest(() => fetchProfileVersions(API_BASE_URL)),
      optionalRequest(() => fetchArchiveChanges(API_BASE_URL)),
      loadArchiveTimeline(),
      optionalRequest(() => fetchCurrentMatch(API_BASE_URL)),
      optionalRequest(() => fetchCurrentAdvice(API_BASE_URL))
    ]);

    setDashboard({
      health,
      user,
      records,
      events,
      bazi,
      profile,
      profileVersions: profileVersions?.items ?? [],
      changes: changes?.items ?? [],
      timeline,
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

  useEffect(() => {
    if (isInitialLoading) {
      return;
    }

    let cancelled = false;

    async function refreshTimelineOnly() {
      try {
        const items = await loadArchiveTimeline();
        if (!cancelled) {
          setDashboard((current) => ({
            ...current,
            timeline: items
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setErrorText(error instanceof Error ? error.message : "时间线加载失败");
        }
      }
    }

    void refreshTimelineOnly();

    return () => {
      cancelled = true;
    };
  }, [selectedTimelineTypes, timelineProfileFilter, isInitialLoading]);

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

  async function handleTimelineProfileJump(versionNo: number) {
    setErrorText(null);

    try {
      const profile = await fetchProfileVersion(API_BASE_URL, versionNo);
      setSelectedProfilePreview(profile);
      setSelectedProfilePreviewVersion(versionNo);
      setStatusText(`已联动到画像版本 V${versionNo}。`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "画像版本加载失败");
    }
  }

  function toggleTimelineType(type: string) {
    setSelectedTimelineTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
    );
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

  async function handleSubmitQuestionnaire(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorText(null);

    const answers = questions
      .map((question) => ({
        questionId: question.questionId,
        value: questionnaireAnswers[question.questionId]
      }))
      .filter((item) => item.value)
      .map((item) => ({
        questionId: item.questionId,
        value: item.value,
        metadata: {
          source: "web_workbench"
        }
      }));

    if (answers.length === 0) {
      setErrorText("请至少回答一个问题。");
      return;
    }

    setIsBusy(true);

    try {
      const result = await submitQuestionnaireAnswers(API_BASE_URL, answers);
      await loadDashboard();
      setStatusText(`问答已提交，画像更新到版本 ${result.profileVersion}`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "问答提交失败");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSubmitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorText(null);

    if (!eventForm.eventTime || !eventForm.title) {
      setErrorText("请填写事件时间和事件标题。");
      return;
    }

    setIsBusy(true);

    try {
      const result = await createLifeEvent(API_BASE_URL, {
        eventType: eventForm.eventType,
        eventTime: new Date(eventForm.eventTime).toISOString(),
        title: eventForm.title,
        description: eventForm.description || null,
        impactScore: Number(eventForm.impactScore) || null,
        payload: {
          source: "web_workbench"
        }
      });
      await loadDashboard();
      setEventForm(INITIAL_EVENT_FORM);
      setStatusText(`事件已记录，画像更新到版本 ${result.profileVersion}`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "事件提交失败");
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
    },
    {
      label: "变化记录数",
      value: dashboard.changes.length
    },
    {
      label: "时间线节点",
      value: dashboard.timeline.length
    }
  ];

  const latestChange = dashboard.changes[0] ?? null;
  const timelineFilterSummary =
    selectedTimelineTypes.length > 0
      ? TIMELINE_FILTERS.filter((item) => selectedTimelineTypes.includes(item.value))
          .map((item) => item.label)
          .join(" / ")
      : "全部类型";

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

            <SectionCard title="重大事件录入" eyebrow="LIFE EVENTS">
              <form onSubmit={handleSubmitEvent} style={{ display: "grid", gap: 14 }}>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ color: "#d4d4d8" }}>事件类型</span>
                  <select
                    value={eventForm.eventType}
                    onChange={(event) =>
                      setEventForm((current) => ({ ...current, eventType: event.target.value }))
                    }
                    style={inputStyle}
                  >
                    <option value="career_change">职业变动</option>
                    <option value="relationship_change">关系变化</option>
                    <option value="relocation">迁居</option>
                    <option value="education">学习成长</option>
                    <option value="financial_shift">财务波动</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ color: "#d4d4d8" }}>事件时间</span>
                  <input
                    type="datetime-local"
                    value={eventForm.eventTime}
                    onChange={(event) =>
                      setEventForm((current) => ({ ...current, eventTime: event.target.value }))
                    }
                    style={inputStyle}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ color: "#d4d4d8" }}>事件标题</span>
                  <input
                    value={eventForm.title}
                    onChange={(event) =>
                      setEventForm((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="如：离职创业"
                    style={inputStyle}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ color: "#d4d4d8" }}>事件描述</span>
                  <textarea
                    value={eventForm.description}
                    onChange={(event) =>
                      setEventForm((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="补充事件背景和你的主观感受"
                    style={{ ...inputStyle, minHeight: 96, resize: "vertical" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ color: "#d4d4d8" }}>影响强度（0-100）</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={eventForm.impactScore}
                    onChange={(event) =>
                      setEventForm((current) => ({ ...current, impactScore: event.target.value }))
                    }
                    style={inputStyle}
                  />
                </label>
                <button type="submit" style={primaryButtonStyle} disabled={isBusy || !dashboard.user}>
                  {isBusy ? "记录中..." : "记录事件并重算"}
                </button>
              </form>
            </SectionCard>

            <SectionCard title="持续问答校准" eyebrow="QUESTIONNAIRE">
              {questions.length > 0 ? (
                <form onSubmit={handleSubmitQuestionnaire} style={{ display: "grid", gap: 18 }}>
                  {questions.map((question) => (
                    <div
                      key={question.questionId}
                      style={{
                        borderRadius: 18,
                        padding: 16,
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.06)"
                      }}
                    >
                      <div style={{ fontSize: 16, lineHeight: 1.7, marginBottom: 10 }}>
                        {question.questionText}
                      </div>
                      <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 12 }}>
                        目标维度：{question.traitTargets.join(" / ")}
                      </div>
                      <div style={{ display: "grid", gap: 10 }}>
                        {question.options.map((option) => {
                          const checked = questionnaireAnswers[question.questionId] === option;
                          return (
                            <label
                              key={option}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                borderRadius: 14,
                                padding: "12px 14px",
                                border: checked
                                  ? "1px solid rgba(214, 170, 97, 0.6)"
                                  : "1px solid rgba(255, 255, 255, 0.08)",
                                background: checked
                                  ? "rgba(128, 91, 37, 0.22)"
                                  : "rgba(255, 255, 255, 0.02)",
                                cursor: "pointer"
                              }}
                            >
                              <input
                                type="radio"
                                name={question.questionId}
                                value={option}
                                checked={checked}
                                onChange={() =>
                                  setQuestionnaireAnswers((current) => ({
                                    ...current,
                                    [question.questionId]: option
                                  }))
                                }
                              />
                              <span>{option}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button type="submit" style={primaryButtonStyle} disabled={isBusy || !dashboard.user}>
                      {isBusy ? "提交中..." : "提交问答并重算"}
                    </button>
                  </div>
                </form>
              ) : (
                <EmptyState text="问答题库还未加载。" />
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
                  {latestChange ? (
                    <div
                      style={{
                        borderRadius: 18,
                        padding: 16,
                        background: "rgba(214, 170, 97, 0.08)",
                        border: "1px solid rgba(214, 170, 97, 0.18)"
                      }}
                    >
                      <div style={{ color: "#c9a96a", fontSize: 12, marginBottom: 8 }}>最近一次变化</div>
                      <div style={{ fontSize: 16, lineHeight: 1.8, marginBottom: 12 }}>
                        {latestChange.reasonSummary.headline ?? "当前暂无变化摘要。"}
                      </div>
                      <KeyValueList
                        items={[
                          {
                            label: "版本跃迁",
                            value: `V${latestChange.fromVersion} -> V${latestChange.toVersion}`
                          },
                          {
                            label: "新增证据",
                            value: (latestChange.reasonSummary.newEvidence ?? []).join(" / ") || "无"
                          },
                          {
                            label: "低置信度维度",
                            value:
                              (latestChange.changedDimensions.uncertainDimensions ?? []).join(" / ") || "无"
                          }
                        ]}
                      />
                    </div>
                  ) : null}
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

            <SectionCard title="成长档案时间线" eyebrow="ARCHIVE TIMELINE">
              <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {TIMELINE_FILTERS.map((filter) => {
                    const active = selectedTimelineTypes.includes(filter.value);
                    return (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => toggleTimelineType(filter.value)}
                        style={active ? activeFilterButtonStyle : filterButtonStyle}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    gap: 12,
                    alignItems: "center"
                  }}
                >
                  <select
                    value={timelineProfileFilter ?? ""}
                    onChange={(event) =>
                      setTimelineProfileFilter(event.target.value ? Number(event.target.value) : null)
                    }
                    style={inputStyle}
                  >
                    <option value="">全部画像版本</option>
                    {dashboard.profileVersions.map((item) => (
                      <option key={item.profileId} value={item.profileVersion}>
                        V{item.profileVersion}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={() => {
                      setSelectedTimelineTypes([]);
                      setTimelineProfileFilter(null);
                    }}
                  >
                    清空筛选
                  </button>
                </div>
                <div style={{ color: "#9ca3af", fontSize: 13 }}>
                  当前筛选：{timelineFilterSummary}
                  {timelineProfileFilter ? ` / 版本 V${timelineProfileFilter}` : ""}
                </div>
              </div>
              {dashboard.timeline.length > 0 ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {dashboard.timeline.map((item, index) => {
                    const itemKey = `${item.itemType}-${item.occurredAt}-${index}`;
                    const isExpanded = expandedTimelineItemKey === itemKey;

                    return (
                      <div
                        key={itemKey}
                        style={{
                          borderRadius: 18,
                          padding: 16,
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid rgba(255, 255, 255, 0.06)"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                          <strong>{item.title}</strong>
                          <span style={{ color: "#9ca3af", fontSize: 12 }}>{formatDateTime(item.occurredAt)}</span>
                        </div>
                        <div style={{ color: "#d4d4d8", lineHeight: 1.7 }}>{item.summary}</div>
                        <div style={{ color: "#9ca3af", lineHeight: 1.7, marginTop: 8 }}>
                          节点类型：{item.itemType}
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                          <button
                            type="button"
                            style={secondaryButtonStyle}
                            onClick={() =>
                              setExpandedTimelineItemKey((current) => (current === itemKey ? null : itemKey))
                            }
                          >
                            {isExpanded ? "收起详情" : "展开详情"}
                          </button>
                          {item.profileVersion ? (
                            <button
                              type="button"
                              style={primaryButtonStyle}
                              onClick={() => void handleTimelineProfileJump(item.profileVersion)}
                            >
                              查看 V{item.profileVersion}
                            </button>
                          ) : null}
                        </div>
                        {isExpanded ? (
                          <div style={{ marginTop: 12 }}>
                            <InfoBlock title="节点元数据" value={item.metadata} />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState text="画像、匹配、建议和事件开始沉淀后，这里会形成统一成长时间线。" />
              )}
            </SectionCard>

            <SectionCard title="时间线联动画像版本" eyebrow="PROFILE PREVIEW">
              {selectedProfilePreview ? (
                <div style={{ display: "grid", gap: 16 }}>
                  <KeyValueList
                    items={[
                      { label: "联动版本", value: selectedProfilePreviewVersion ?? 0 },
                      { label: "引擎版本", value: selectedProfilePreview.engineVersion },
                      {
                        label: "画像总分",
                        value:
                          typeof selectedProfilePreview.summary.score === "number"
                            ? selectedProfilePreview.summary.score
                            : "暂无"
                      }
                    ]}
                  />
                  <InfoBlock title="画像摘要" value={selectedProfilePreview.summary} />
                  <InfoBlock title="性格特征" value={selectedProfilePreview.personalityTraits} />
                  <InfoBlock title="能力特征" value={selectedProfilePreview.abilityTraits} />
                  <InfoBlock title="关系特征" value={selectedProfilePreview.relationshipTraits} />
                  <InfoBlock title="运势特征" value={selectedProfilePreview.fortuneTraits} />
                </div>
              ) : (
                <EmptyState text="从时间线节点点击“查看 Vx”后，这里会加载对应版本的画像详情。" />
              )}
            </SectionCard>

            <SectionCard title="人生事件时间线" eyebrow="TIMELINE">
              {dashboard.events.length > 0 ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {dashboard.events.map((item) => (
                    <div
                      key={item.eventId}
                      style={{
                        borderRadius: 18,
                        padding: 16,
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.06)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                        <strong>{item.title}</strong>
                        <span style={{ color: "#9ca3af", fontSize: 12 }}>{formatDateTime(item.eventTime)}</span>
                      </div>
                      <div style={{ color: "#d4d4d8", lineHeight: 1.7 }}>{item.description || "无补充描述"}</div>
                      <div style={{ color: "#9ca3af", lineHeight: 1.7, marginTop: 8 }}>
                        类型：{item.eventType} / 影响强度：{item.impactScore ?? "未填写"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="还没有人生事件，录入重大转折后会出现在这里。" />
              )}
            </SectionCard>

            <SectionCard title="版本变化记录" eyebrow="CHANGE LOGS">
              {dashboard.changes.length > 0 ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {dashboard.changes.map((item) => (
                    <div
                      key={item.changeId}
                      style={{
                        borderRadius: 18,
                        padding: 16,
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.06)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                        <strong>
                          V{item.fromVersion} -> V{item.toVersion}
                        </strong>
                        <span style={{ color: "#9ca3af", fontSize: 12 }}>{formatDateTime(item.createdAt)}</span>
                      </div>
                      <div style={{ color: "#d4d4d8", lineHeight: 1.7, marginBottom: 8 }}>
                        {item.reasonSummary.headline ?? "本次变化暂无摘要。"}
                      </div>
                      <div style={{ color: "#9ca3af", lineHeight: 1.7 }}>
                        上升：{(item.changedDimensions.raised ?? []).join("、") || "无"}
                      </div>
                      <div style={{ color: "#9ca3af", lineHeight: 1.7 }}>
                        下降：{(item.changedDimensions.lowered ?? []).join("、") || "无"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="画像开始演进后，这里会记录每次版本变化的原因。" />
              )}
            </SectionCard>

            <SectionCard title="画像版本历史" eyebrow="VERSIONS">
              {dashboard.profileVersions.length > 0 ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {dashboard.profileVersions.map((item) => (
                    <div
                      key={item.profileId}
                      style={{
                        borderRadius: 18,
                        padding: 16,
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.06)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                        <strong>V{item.profileVersion}</strong>
                        <span style={{ color: "#9ca3af", fontSize: 12 }}>{formatDateTime(item.createdAt)}</span>
                      </div>
                      <div style={{ color: "#d4d4d8", lineHeight: 1.7 }}>
                        关键词：
                        {Array.isArray(item.summary.keywords) ? item.summary.keywords.join("、") : "暂无"}
                      </div>
                      <div style={{ color: "#9ca3af", lineHeight: 1.7, marginTop: 6 }}>
                        总分：{typeof item.summary.score === "number" ? item.summary.score : "暂无"} / 引擎：
                        {item.engineVersion}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="还没有画像版本历史。" />
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

const filterButtonStyle: CSSProperties = {
  ...secondaryButtonStyle,
  padding: "10px 16px",
  fontSize: 13
};

const activeFilterButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  padding: "10px 16px",
  fontSize: 13
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
