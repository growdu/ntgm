"use client";

import { useState, useEffect } from "react";
import { AppShell } from "../components/Navigation";
import { fetchNextQuestions, submitQuestionnaireAnswers } from "@ntgm/sdk";
import type { QuestionnaireQuestion, QuestionnaireAnswerItem } from "@ntgm/sdk";
import styles from "./questionnaire.module.css";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const STORAGE_KEY = "ntgm_questionnaire_progress";

interface Answer {
  questionId: string;
  selectedOption: string;
  reasoning: string;
  timestamp: string;
}

export default function QuestionnairePage() {
  const [questions, setQuestions] = useState<QuestionnaireQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submitted, setSubmitted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confidenceMap, setConfidenceMap] = useState<Record<string, number>>(
    {}
  );

  const total = questions.length;
  const currentQuestion = questions[currentIndex];

  // Load from localStorage or fetch from API
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { q, a, r, idx } = JSON.parse(saved);
        setQuestions(q);
        setAnswers(a || {});
        setReasoning(r || {});
        setCurrentIndex(idx || 0);
        setLoading(false);
      } catch {
        // ignore parse errors
        loadFromApi();
      }
    } else {
      loadFromApi();
    }
  }, []);

  const loadFromApi = () => {
    fetchNextQuestions(API_BASE_URL)
      .then((r) => setQuestions(r.questions))
      .catch(() => {
        // keep empty on error
      })
      .finally(() => setLoading(false));
  };

  // Persist to localStorage
  useEffect(() => {
    if (!loading && questions.length > 0) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          q: questions,
          a: answers,
          r: reasoning,
          idx: currentIndex,
        })
      );
    }
  }, [questions, answers, reasoning, currentIndex, loading]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      const prevAnswer = answers[`q-${prevIdx}`];
      if (prevAnswer) {
        setSelectedOption(prevAnswer.selectedOption);
      } else {
        setSelectedOption(null);
      }
    }
  };

  const handleNext = async () => {
    if (!selectedOption) {
      showToast("请择一个选项");
      return;
    }

    const answer: Answer = {
      questionId: currentQuestion.questionId ?? "",
      selectedOption: selectedOption ?? "",
      reasoning: reasoning[currentQuestion.questionId ?? ""] || "",
      timestamp: new Date().toISOString(),
    };

    const newAnswers = { ...answers, [`q-${currentIndex}`]: answer };
    setAnswers(newAnswers);

    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
    } else {
      // Submit all answers
      try {
        const answerItems: QuestionnaireAnswerItem[] = Object.entries(
          newAnswers
        ).map(([_, a]) => ({
          questionId: a.questionId,
          value: a.selectedOption,
          reason: a.reasoning || null,
        }));
        await submitQuestionnaireAnswers(API_BASE_URL, answerItems);
        setSubmitted(true);
        showToast("所有问题已成，感谢汝之回答！");
        // Clear localStorage after successful submit
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        showToast("传失败，请重试");
      }
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.completedState}>
              <p className={styles.completedDesc}>载入中...</p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // Guard: if no questions available, show empty state
  if (!loading && questions.length === 0) {
    return (
      <AppShell>
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.completedState}>
              <div className={styles.completedIcon}>&#9789;</div>
              <h2 className={styles.completedTitle}>暂无待回答问题</h2>
              <p className={styles.completedDesc}>
                系统尚未生成新的校准问题。请先成立命之资。
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (submitted) {
    return (
      <AppShell>
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.completedState}>
              <div className={styles.completedIcon}>&#10003;</div>
              <h2 className={styles.completedTitle}>问答成</h2>
              <p className={styles.completedDesc}>
                你已成 {total} 道校准问题。系统将根据汝之回答新画像。
              </p>
              <p className={styles.completedSub}>
                预计置信度提升：趋避之性 +8%，长线之志 +5%
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {toastMessage && (
        <div className={styles.toast} role="alert">
          {toastMessage}
        </div>
      )}
      <div className={styles.page}>
        <div className={styles.container}>
          {/* 进度 */}
          <div className={styles.progressSection}>
            <div className={styles.progressInfo}>
              <span className={styles.progressText}>
                校准汝之画像：第 {currentIndex + 1} / {total} 题
              </span>
              <div className={styles.progressBarWrap}>
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${total > 0 ? ((currentIndex + 1) / total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className={styles.content}>
            {/* 问题区 */}
            <div className={styles.mainSection}>
              <div className={`${styles.card} ${styles.questionCard}`}>
                <div className={styles.questionHeader}>
                  <span className={styles.impactBadge}>
                    <span className={styles.impactIcon}>&#128202;</span>
                    {currentQuestion.traitTargets?.join(", ") ?? ""}
                  </span>
                </div>
                <h2 className={styles.questionText}>
                  {currentQuestion.questionText}
                </h2>

                <div className={styles.options}>
                  {(currentQuestion.options ?? []).map((option) => (
                    <label
                      key={option}
                      className={`${styles.optionItem} ${selectedOption === option ? styles.selected : ""}`}
                    >
                      <input
                        type="radio"
                        name="answer"
                        value={option}
                        checked={selectedOption === option}
                        onChange={() => setSelectedOption(option)}
                        className={styles.radioInput}
                        aria-label={option}
                      />
                      <span className={styles.optionRadio} />
                      <span className={styles.optionLabel}>{option}</span>
                    </label>
                  ))}
                </div>

                <div className={styles.reasoningSection}>
                  <label className={styles.reasoningLabel}>
                    补充说明（可选）
                  </label>
                  <textarea
                    value={reasoning[currentQuestion.questionId ?? ""] || ""}
                    onChange={(e) =>
                      setReasoning((prev) => ({
                        ...prev,
                        [currentQuestion.questionId ?? ""]: e.target.value,
                      }))
                    }
                    placeholder="可补充一些背景信息，帮助系统更准确地理解汝之择..."
                    className={styles.reasoningInput}
                    rows={3}
                    aria-label="补充说明"
                  />
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  className="btn btn-secondary"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                >
                  上一题
                </button>
                <button className="btn btn-primary" onClick={handleNext}>
                  {currentIndex < total - 1 ? "传并续" : "成问答"}
                </button>
              </div>
            </div>

            {/* 右预览 */}
            <div className={styles.sidebar}>
              <div className={`${styles.card} ${styles.previewCard}`}>
                <h3 className={styles.previewTitle}>
                  <span className={styles.previewIcon}>&#128768;</span>
                  今回答后，系统可能会：
                </h3>
                <ul className={styles.previewList}>
                  {(currentQuestion.traitTargets ?? []).map((trait, index) => (
                    <li key={index} className={styles.previewItem}>
                      <span className={styles.previewDot} />
                      调整 {trait} 相关评估
                    </li>
                  ))}
                </ul>
              </div>

              <div className={`${styles.card} ${styles.hintCard}`}>
                <h3 className={styles.hintTitle}>答题示</h3>
                <ul className={styles.hintList}>
                  <li>根据汝之真实行为择，而非理想状态</li>
                  <li>无正确答案，系统须的是真实的你</li>
                  <li>可补充说明来提供更多上下文</li>
                </ul>
              </div>

              <div className={`${styles.card} ${styles.progressCard}`}>
                <h3 className={styles.progressTitle}>今之画像置信度</h3>
                <div className={styles.confidenceList}>
                  {Object.entries({
                    riskPreference: "趋避之性",
                    longTermOrientation: "长线之志",
                    emotionStability: "静定之力",
                  }).map(([key, label]) => (
                    <div key={key} className={styles.confidenceItem}>
                      <span>{label}</span>
                      <span className={styles.confidenceValue}>
                        {Math.round((confidenceMap[key] || 0.5) * 100)}%
                      </span>
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
