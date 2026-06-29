"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { AppShell } from "../components/Navigation";
import { useAuth, toErrorMessage } from "../../lib/auth";
import { PlanGuard } from "../../lib/plan-guard";
import {
  aiAssist,
  clearDraft,
  createWork,
  deleteWork,
  getAiQuotaForPlan,
  getAiUsage,
  listWorks,
  loadDraft,
  saveDraft,
  updateWork,
  type AiAssistMode,
} from "../../lib/mockApi";
import { Toast } from "../components/Toast";
import type { Work } from "@ntgm/sdk";

const DRAFT_SAVE_DEBOUNCE_MS = 1500;

export default function CreatePage() {
  return (
    <AppShell>
      <PlanGuard requiredPlan="pro" enforce={false}>
        <CreateContent />
      </PlanGuard>
    </AppShell>
  );
}

function CreateContent() {
  const { user, plan } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [draftPromptVisible, setDraftPromptVisible] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<{
    title: string;
    body: string;
    tagsRaw: string;
    savedAt: string;
  } | null>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI 状态
  const [aiMode, setAiMode] = useState<AiAssistMode | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuota, setAiQuota] = useState<{
    used: number;
    total: number | "unlimited";
  }>({ used: 0, total: getAiQuotaForPlan(plan) });
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  function refreshAiQuota() {
    if (!user) return;
    const u = getAiUsage(user.userId);
    const total = getAiQuotaForPlan(plan);
    setAiQuota({ used: u.count, total });
  }

  useEffect(() => {
    refreshAiQuota();
    // 订阅 plan 变
  }, [plan, user]);

  const aiAvailable = aiQuota.total !== 0;

  const loadWorks = async () => {
    setLoading(true);
    try {
      const res = await listWorks();
      setWorks(res.works);
    } catch (err) {
      console.error("Failed to load works", err);
    } finally {
      setLoading(false);
    }
  };

  // 检查是否有草稿
  useEffect(() => {
    if (!user) return;
    const draft = loadDraft(user.userId);
    if (draft && (draft.title.trim() || draft.body.trim())) {
      setPendingDraft(draft);
      setDraftPromptVisible(true);
    }
  }, [user]);

  useEffect(() => {
    loadWorks();
  }, []);

  // 草稿自动存
  useEffect(() => {
    if (!user) return;
    if (editingId) return; // 编辑模式不存草稿
    if (!title.trim() && !body.trim()) return;

    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      saveDraft(user.userId, { title, body, tagsRaw });
      setDraftSavedAt(new Date().toISOString());
    }, DRAFT_SAVE_DEBOUNCE_MS);

    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [title, body, tagsRaw, user, editingId]);

  const handleRestoreDraft = () => {
    if (pendingDraft) {
      setTitle(pendingDraft.title);
      setBody(pendingDraft.body);
      setTagsRaw(pendingDraft.tagsRaw);
      setDraftSavedAt(pendingDraft.savedAt);
    }
    setDraftPromptVisible(false);
    setPendingDraft(null);
  };

  const handleDiscardDraft = () => {
    if (user) clearDraft(user.userId);
    setDraftPromptVisible(false);
    setPendingDraft(null);
  };

  const resetForm = () => {
    setTitle("");
    setBody("");
    setTagsRaw("");
    setEditingId(null);
    setError(null);
    if (user) clearDraft(user.userId);
    setDraftSavedAt(null);
  };

  const startEdit = (work: Work) => {
    setEditingId(work.workId);
    setTitle(work.title);
    setBody(work.body);
    setTagsRaw(work.tags.join(", "));
    setError(null);
    setSuccess(null);
    // 滚动到顶部
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleDelete = async (workId: string) => {
    if (!confirm("定要除这篇作品吗？此操作不可恢复。")) return;
    try {
      await deleteWork(workId);
      setSuccess("作品已除");
      if (editingId === workId) resetForm();
      await loadWorks();
    } catch (err) {
      setError(toErrorMessage(err));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (title.trim().length < 4) {
      setError("标题至少 4 个字");
      return;
    }
    if (body.trim().length < 20) {
      setError("正文至少 20 字");
      return;
    }

    const tags = tagsRaw
      .split(/[,，、\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      if (editingId) {
        await updateWork(editingId, { title, body, tags });
        setSuccess("已新");
      } else {
        await createWork({ title, body, tags, visibility: "public" });
        setSuccess("发布成功！");
      }
      resetForm();
      await loadWorks();
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Markdown preview
  const previewHtml = useMemo(() => {
    if (!showPreview || !body) return "";
    const raw = marked.parse(body, { async: false }) as string;
    return DOMPurify.sanitize(raw);
  }, [body, showPreview]);

  async function handleAiAssist(mode: AiAssistMode) {
    if (!body.trim()) {
      setError("请先写一些正文，再让 AI 辅助");
      return;
    }
    setAiMode(mode);
    setAiLoading(true);
    setError(null);
    setAiSuggestion(null);
    try {
      const { result, remaining } = await aiAssist(body, mode);
      setAiSuggestion(result);
      setAiQuota((q) => ({
        total: q.total,
        used:
          q.total === "unlimited"
            ? 0
            : q.total - (typeof remaining === "number" ? remaining : 0),
      }));
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setAiLoading(false);
    }
  }

  function applyAiSuggestion() {
    if (!aiSuggestion) return;
    setBody((prev) => {
      if (aiMode === "polish" || aiMode === "summarize") return aiSuggestion;
      return prev + aiSuggestion;
    });
    setAiSuggestion(null);
    setSuccess("已应用 AI 建议");
  }

  const myWorks = works.filter((w) => w.authorId === user?.userId);

  return (
    <div className="createShell">
      <div className="createHeader">
        <h1 className="createTitle">化人 · 传心</h1>
        <p className="createSubtitle">
          传汝之解读、心得、命例。支持 Markdown，进境用户可发与改。
        </p>
      </div>

      {/* 草稿恢复示 */}
      {draftPromptVisible && pendingDraft && (
        <div
          style={{
            background: "rgba(192, 166, 106, 0.12)",
            border: "1px solid var(--border-gold)",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>
            ✨ 发现未成的草稿（存于{" "}
            {new Date(pendingDraft.savedAt).toLocaleString("zh-CN")}）
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleRestoreDraft}
              className="btn btn-primary"
              style={{ padding: "6px 14px", fontSize: "0.85rem" }}
            >
              恢复
            </button>
            <button
              onClick={handleDiscardDraft}
              className="btn btn-ghost"
              style={{ padding: "6px 14px", fontSize: "0.85rem" }}
            >
              丢弃
            </button>
          </div>
        </div>
      )}

      <div className="createCard">
        {editingId && (
          <div
            style={{
              fontSize: "0.85rem",
              color: "var(--accent-gold)",
              marginBottom: 16,
              padding: "8px 12px",
              background: "rgba(192, 166, 106, 0.08)",
              border: "1px solid var(--border-gold)",
              borderRadius: 6,
            }}
          >
            ✎ 正在编辑作品
            <button
              onClick={resetForm}
              style={{
                float: "right",
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontFamily: "inherit",
              }}
            >
              销编辑
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="formField" style={{ marginBottom: 16 }}>
            <label className="createLabel" htmlFor="title">
              标题
            </label>
            <input
              id="title"
              className="createInput"
              placeholder="给汝之解读起个标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              disabled={submitting}
            />
          </div>

          <div className="formField" style={{ marginBottom: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <label
                className="createLabel"
                htmlFor="body"
                style={{ margin: 0 }}
              >
                正文（支持 Markdown）
              </label>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className={showPreview ? "btn btn-ghost" : "btn btn-primary"}
                  style={{ padding: "4px 12px", fontSize: "0.78rem" }}
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className={showPreview ? "btn btn-primary" : "btn btn-ghost"}
                  style={{ padding: "4px 12px", fontSize: "0.78rem" }}
                  disabled={!body.trim()}
                >
                  预览
                </button>
                <span
                  style={{
                    width: 1,
                    height: 20,
                    background: "var(--border-color)",
                    margin: "0 4px",
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleAiAssist("continue")}
                  disabled={!aiAvailable || aiLoading}
                  className="btn btn-ghost"
                  style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                  title="续写：AI 根据已有内容往下写一段"
                >
                  ✎ 续写
                </button>
                <button
                  type="button"
                  onClick={() => handleAiAssist("polish")}
                  disabled={!aiAvailable || aiLoading}
                  className="btn btn-ghost"
                  style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                  title="润色：规整空行、补全句末标点"
                >
                  ✦ 润色
                </button>
                <button
                  type="button"
                  onClick={() => handleAiAssist("expand")}
                  disabled={!aiAvailable || aiLoading}
                  className="btn btn-ghost"
                  style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                  title="扩写：补充背景与延伸"
                >
                  ↗ 扩写
                </button>
                <button
                  type="button"
                  onClick={() => handleAiAssist("summarize")}
                  disabled={!aiAvailable || aiLoading}
                  className="btn btn-ghost"
                  style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                  title="总结：提炼核心观点"
                >
                  ⊕ 总结
                </button>
                {aiAvailable && (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      marginLeft: 4,
                    }}
                    title="今剩余次数"
                  >
                    {aiQuota.total === "unlimited"
                      ? "∞"
                      : `${Math.max(0, aiQuota.total - aiQuota.used)}/${aiQuota.total}`}
                  </span>
                )}
                {!aiAvailable && (
                  <Link
                    href="/pricing"
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--accent-gold)",
                      marginLeft: 4,
                    }}
                  >
                    升级解锁 AI
                  </Link>
                )}
              </div>
            </div>

            {/* AI 载入态 / 建议展示 */}
            {aiLoading && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "rgba(192, 166, 106, 0.08)",
                  border: "1px solid var(--border-gold)",
                  borderRadius: 8,
                  marginBottom: 12,
                  fontSize: "0.85rem",
                  color: "var(--accent-gold)",
                }}
              >
                ✦ AI 正在
                {aiMode === "continue"
                  ? "续写"
                  : aiMode === "polish"
                    ? "润色"
                    : aiMode === "expand"
                      ? "扩写"
                      : "总结"}
                …
              </div>
            )}

            {aiSuggestion && !aiLoading && (
              <div
                style={{
                  padding: 16,
                  background: "rgba(90, 158, 143, 0.08)",
                  border: "1px solid rgba(90, 158, 143, 0.4)",
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--accent-jade-light)",
                      fontWeight: 600,
                    }}
                  >
                    ✦ AI 建议
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setAiSuggestion(null)}
                      className="btn btn-ghost"
                      style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                    >
                      丢弃
                    </button>
                    <button
                      type="button"
                      onClick={applyAiSuggestion}
                      className="btn btn-primary"
                      style={{ padding: "4px 12px", fontSize: "0.78rem" }}
                    >
                      采纳
                    </button>
                  </div>
                </div>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    fontFamily: "inherit",
                    margin: 0,
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                    lineHeight: 1.7,
                    maxHeight: 200,
                    overflow: "auto",
                  }}
                >
                  {aiSuggestion}
                </pre>
              </div>
            )}

            {showPreview ? (
              <div
                className="createInput createTextarea markdown"
                style={{
                  minHeight: 200,
                  background: "var(--bg-secondary)",
                  overflow: "auto",
                }}
                dangerouslySetInnerHTML={{
                  __html:
                    previewHtml ||
                    '<p style="color: var(--text-muted)">无内容</p>',
                }}
              />
            ) : (
              <textarea
                id="body"
                className="createInput createTextarea"
                placeholder="写点什么… 至少 20 字。支持 **加粗**、*斜体*、`代码`、# 标题、- 列表、> 引用、链接等"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={20000}
                disabled={submitting}
              />
            )}
            <div
              className="createMeta"
              style={{ textAlign: "right", marginTop: 4 }}
            >
              {body.length} / 20000
            </div>
          </div>

          <div className="formField" style={{ marginBottom: 8 }}>
            <label className="createLabel" htmlFor="tags">
              标签（可选，逗号分隔）
            </label>
            <input
              id="tags"
              className="createInput"
              placeholder="随笔, 八字, 改命"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="formError" style={{ marginTop: 12 }}>
              ⚠ {error}
            </div>
          )}
          {success && (
            <div
              style={{
                color: "var(--accent-jade-light)",
                marginTop: 12,
                fontSize: "0.9rem",
              }}
            >
              ✓ {success}
            </div>
          )}

          <div className="createActions">
            <span className="createMeta">
              {!editingId && draftSavedAt && (
                <>
                  草稿已存 ·{" "}
                  {new Date(draftSavedAt).toLocaleTimeString("zh-CN")}
                </>
              )}
              {editingId && <>编辑模式：发布按钮将新现有作品</>}
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={resetForm}
              disabled={submitting}
            >
              清空
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? "处理中..." : editingId ? "存改" : "发布"}
            </button>
          </div>
        </form>
      </div>

      {/* 吾之创作 */}
      {myWorks.length > 0 && (
        <>
          <h2
            style={{
              color: "var(--text-primary)",
              fontSize: "1.2rem",
              marginBottom: 16,
              marginTop: 32,
            }}
          >
            吾之创作 ({myWorks.length})
          </h2>
          <div className="createWorkList">
            {myWorks.map((w) => (
              <div key={w.workId} className="createWork">
                <div className="createWorkTitle">{w.title}</div>
                <div className="createWorkBody">{w.body}</div>
                <div className="createWorkFooter">
                  <span>👁 {w.views}</span>
                  <span>♡ {w.likes}</span>
                  <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    <button
                      onClick={() => startEdit(w)}
                      className="btn btn-ghost"
                      style={{ padding: "4px 12px", fontSize: "0.78rem" }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(w.workId)}
                      className="btn btn-danger"
                      style={{ padding: "4px 12px", fontSize: "0.78rem" }}
                    >
                      除
                    </button>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2
        style={{
          color: "var(--text-primary)",
          fontSize: "1.2rem",
          marginBottom: 16,
          marginTop: 32,
        }}
      >
        广场精选
      </h2>
      {loading ? (
        <p className="createMeta">载入中...</p>
      ) : (
        <div className="createWorkList">
          {works.length === 0 ? (
            <p className="createMeta">还无作品。来做第一个吧。</p>
          ) : (
            works.map((w) => <WorkCard key={w.workId} work={w} />)
          )}
        </div>
      )}

      {success && <Toast message={success} type="success" />}
      {error && <Toast message={error} type="error" />}
    </div>
  );
}

function WorkCard({ work }: { work: Work }) {
  return (
    <div className="createWork">
      <div className="createWorkTitle">{work.title}</div>
      <div className="createWorkBody">{work.body}</div>
      <div className="createWorkFooter">
        <span>@{work.authorName}</span>
        <span className="createWorkStat">👁 {work.views}</span>
        <span className="createWorkStat">♡ {work.likes}</span>
        {work.tags.length > 0 && (
          <span style={{ marginLeft: "auto" }}>
            {work.tags.map((t) => (
              <span
                key={t}
                className="tag"
                style={{ marginRight: 4, fontSize: "0.72rem" }}
              >
                {t}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
