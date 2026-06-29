"use client";

import { fetchCurrentAdvice } from "@ntgm/sdk";
import type { AdviceCurrentResponse } from "@ntgm/sdk";
import { useEffect, useState } from "react";
import { AppShell } from "../components/Navigation";
import { Toast } from "../components/Toast";
import styles from "./advice.module.css";

const STORAGE_KEY_ADVICE = "ntgm_advice_completed";
const STORAGE_KEY_FEEDBACK = "ntgm_advice_feedback";

interface AdviceItem {
  id: string;
  type: "avoid" | "action" | "record";
  title: string;
  content: string;
  reason: string;
  status: "pending" | "completed";
}

// Fallback mock data for display purposes when SDK returns empty summary
const MOCK_TODAY_ADVICE = [
  {
    id: "advice-1",
    type: "avoid" as const,
    title: "避免冒险",
    content: "今避免参与高风险投资决策",
    reason: "水星逆行期间，投资决策需格外谨慎",
    status: "pending" as const,
  },
  {
    id: "advice-2",
    type: "action" as const,
    title: "宜主言",
    content: "与尊长或道侣一对一言",
    reason: "木星相位有利于建立信任关系",
    status: "pending" as const,
  },
  {
    id: "advice-3",
    type: "record" as const,
    title: "记录灵感",
    content: "随身携带笔记本，记录突发灵感",
    reason: "今思维活跃，灵感易逝须即记",
    status: "pending" as const,
  },
];

const MOCK_WEEKLY_PLAN = [
  {
    day: 1,
    title: "自我评估",
    description: "成个人SWOT分析，明势与短",
  },
  { day: 2, title: "关系之梳", description: "整理重要人脉关系，建立联系清单" },
  { day: 3, title: "目标拆解", description: "将年志分为季程" },
  { day: 4, title: "术之积", description: "学一与汝之志相关的新术" },
  { day: 5, title: "执行验", description: "验本周计划执行效果并记录" },
];

const MOCK_LUCKY_DAYS = [
  { date: "2026-05-20", activity: "签订合同", note: "金星顺行，利于合约签署" },
  {
    date: "2026-05-23",
    activity: "社交应酬",
    note: "木星拱相位，人脉资源整合好时机",
  },
  { date: "2026-05-28", activity: "学进修", note: "水星合相，适合知识入" },
];

// Type for advice item (defined above)
// interface AdviceItem {
//   id: string;
//   type: "avoid" | "action" | "record";
//   title: string;
//   content: string;
//   reason: string;
//   status: "pending" | "completed";
// }

// Type for weekly plan day
interface WeeklyPlanDay {
  day: number;
  title: string;
  description: string;
}

// Type for lucky day
interface LuckyDay {
  date: string;
  activity: string;
  note: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export default function AdvicePage() {
  const [advice, setAdvice] = useState<AdviceCurrentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [adviceList, setAdviceList] = useState<AdviceItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ADVICE);
      return saved ? JSON.parse(saved) : MOCK_TODAY_ADVICE;
    } catch {
      return MOCK_TODAY_ADVICE;
    }
  });
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Persist advice completion status
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ADVICE, JSON.stringify(adviceList));
  }, [adviceList]);

  useEffect(() => {
    fetchCurrentAdvice(API_BASE_URL)
      .then((data) => {
        setAdvice(data);
        // Try to extract structured data from summary
        const summary = data?.summary as Record<string, unknown> | undefined;
        if (summary?.todayAdvice && Array.isArray(summary.todayAdvice)) {
          setAdviceList(summary.todayAdvice as unknown as AdviceItem[]);
        }
      })
      .catch(() => {
        // Use fallback mock data on error
        setAdvice(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleMarkDone = (id: string) => {
    setAdviceList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "completed" } : item
      )
    );
    showToast("已志为成！");
  };

  const handleFeedbackSubmit = () => {
    if (!selectedFeedback) {
      showToast("请择回效果");
      return;
    }
    // Persist feedback to localStorage
    try {
      const feedback = {
        type: selectedFeedback,
        text: feedbackText,
        timestamp: new Date().toISOString(),
      };
      const existing = JSON.parse(
        localStorage.getItem(STORAGE_KEY_FEEDBACK) || "[]"
      );
      existing.push(feedback);
      localStorage.setItem(STORAGE_KEY_FEEDBACK, JSON.stringify(existing));
    } catch {
      /* ignore storage errors */
    }
    showToast("回音已达，感谢汝之回！");
    setSelectedFeedback(null);
    setFeedbackText("");
  };

  // Extract data from summary or use fallbacks
  const todayAdvice =
    advice?.summary &&
    Array.isArray((advice.summary as Record<string, unknown>).todayAdvice)
      ? ((advice.summary as Record<string, unknown>)
          .todayAdvice as unknown as AdviceItem[])
      : MOCK_TODAY_ADVICE;

  const weeklyPlan =
    advice?.summary &&
    Array.isArray((advice.summary as Record<string, unknown>).weeklyPlan)
      ? ((advice.summary as Record<string, unknown>)
          .weeklyPlan as unknown as WeeklyPlanDay[])
      : MOCK_WEEKLY_PLAN;

  const luckyDays =
    advice?.summary &&
    Array.isArray((advice.summary as Record<string, unknown>).luckyDays)
      ? ((advice.summary as Record<string, unknown>)
          .luckyDays as unknown as LuckyDay[])
      : MOCK_LUCKY_DAYS;

  // Get profile version for header display
  const profileVersion = advice?.profileVersion ?? 4;

  return (
    <AppShell>
      {toastMessage && <Toast message={toastMessage} type="success" />}
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerContent}>
              <span className="version-tag">{profileVersion}</span>
              <div className={styles.headerInfo}>
                <h1 className={styles.title}>汝之改过之议</h1>
                <p className={styles.subtitle}>
                  依 V{profileVersion} 画像生成的个性化建议
                  {loading && (
                    <span className={styles.loadingIndicator}>载入中...</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className={styles.content}>
            {/* 左主内容 */}
            <div className={styles.mainContent}>
              {/* 今建议 */}
              <div className={`${styles.card} ${styles.todayCard}`}>
                <div className="card-header">
                  <span className="card-title">今建议</span>
                  <span className="tag tag-success">待行</span>
                </div>
                <div className={styles.adviceList}>
                  {adviceList.map((adviceItem) => (
                    <div key={adviceItem.id} className={styles.adviceItem}>
                      <div className={styles.adviceContent}>
                        <div className={styles.adviceType}>
                          <span
                            className={`${styles.typeBadge} ${
                              adviceItem.type === "avoid" ? styles.avoid : ""
                            } ${adviceItem.type === "action" ? styles.action : ""} ${
                              adviceItem.type === "record" ? styles.record : ""
                            }`}
                          >
                            {adviceItem.type === "avoid" && "忌"}
                            {adviceItem.type === "action" && "宜"}
                            {adviceItem.type === "record" && "记"}
                          </span>
                          <span className={styles.adviceTitle}>
                            {adviceItem.title}
                          </span>
                        </div>
                        <p className={styles.adviceText}>
                          {adviceItem.content}
                        </p>
                        <p className={styles.adviceReason}>
                          <span className={styles.reasonLabel}>由：</span>
                          {adviceItem.reason}
                        </p>
                      </div>
                      <div className={styles.adviceActions}>
                        {adviceItem.status === "pending" ? (
                          <button
                            className={styles.markDoneBtn}
                            onClick={() => handleMarkDone(adviceItem.id)}
                            aria-label={`标记"${adviceItem.content}"已行`}
                          >
                            标记已行
                          </button>
                        ) : (
                          <span className={styles.completedBadge}>
                            ✓ 已成
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7日计划 */}
              <div className={`${styles.card} ${styles.weeklyCard}`}>
                <div className="card-header">
                  <span className="card-title">7日计划</span>
                </div>
                <div className={styles.weeklyList}>
                  {weeklyPlan.map((day) => (
                    <div key={day.day} className={styles.weeklyItem}>
                      <div className={styles.dayBadge}>
                        <span className={styles.dayNumber}>Day {day.day}</span>
                      </div>
                      <div className={styles.dayContent}>
                        <h4 className={styles.dayTitle}>{day.title}</h4>
                        <p className={styles.dayDesc}>{day.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 右辅助 */}
            <div className={styles.sidebar}>
              {/* 吉日之示 */}
              <div className={`${styles.card} ${styles.luckyCard}`}>
                <div className="card-header">
                  <span className="card-title">吉日之示</span>
                </div>
                <div className={styles.luckyList}>
                  {luckyDays.map((day) => {
                    const date = new Date(day.date + "T00:00:00");
                    return (
                      <div key={day.date} className={styles.luckyItem}>
                        <div className={styles.luckyDate}>
                          <span className={styles.dateDay}>
                            {date.getDate()}
                          </span>
                          <span className={styles.dateMonth}>
                            {date.getMonth() + 1}月
                          </span>
                        </div>
                        <div className={styles.luckyInfo}>
                          <span className={styles.luckyActivity}>
                            {day.activity}
                          </span>
                          <span className={styles.luckyNote}>{day.note}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 回之入 */}
              <div className={`${styles.card} ${styles.feedbackCard}`}>
                <h3 className={styles.feedbackTitle}>行之效</h3>
                <p className={styles.feedbackText}>
                  记录建议执行后的效果，帮助系统更好地为你定制建议
                </p>
                <div className={styles.feedbackActions}>
                  <button
                    className={`${styles.feedbackBtn} ${selectedFeedback === "good" ? styles.selected : ""}`}
                    onClick={() => setSelectedFeedback("good")}
                    aria-label="有效果"
                  >
                    有效果
                  </button>
                  <button
                    className={`${styles.feedbackBtn} ${selectedFeedback === "normal" ? styles.selected : ""}`}
                    onClick={() => setSelectedFeedback("normal")}
                    aria-label="效果常"
                  >
                    常
                  </button>
                  <button
                    className={`${styles.feedbackBtn} ${selectedFeedback === "none" ? styles.selected : ""}`}
                    onClick={() => setSelectedFeedback("none")}
                    aria-label="无效果"
                  >
                    无效果
                  </button>
                </div>
                <textarea
                  placeholder="补充说明（可选）..."
                  className={styles.feedbackInput}
                  rows={3}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  aria-label="回之补"
                />
                <button
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  onClick={handleFeedbackSubmit}
                >
                  传回
                </button>
              </div>

              {/* 说明 */}
              <div className={`${styles.card} ${styles.infoCard}`}>
                <h3 className={styles.infoTitle}>议之由</h3>
                <p className={styles.infoText}>
                  每条建议都依汝之画像弱项、优势强化、风险规避和目标人物差距修正生成。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
