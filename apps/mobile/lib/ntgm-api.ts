/**
 * Mobile Business API Client — 画像/问答/匹配/建议/档案
 *
 * 遵循 pushClient 的设计：
 * - 单例 client，mock/http 双模式
 * - 失败回退到 mock，不阻塞 UI
 * - 通过 ntgmApi.enable(baseUrl, token) 切换到真实后端
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  ProfileSummaryResponse,
  ProfileVersionItem,
  MatchCurrentResponse,
  AdviceCurrentResponse,
  QuestionnaireQuestion,
  QuestionnaireProgressResponse,
  ArchiveTimelineItem,
  QuestionnaireAnswerItem,
} from "@ntgm/sdk";

export type { ProfileSummaryResponse, MatchCurrentResponse, AdviceCurrentResponse };

export type QuestionnaireState = {
  questions: QuestionnaireQuestion[];
  answers: Record<string, string>;
  currentIndex: number;
};

export type ProfileState = {
  current: ProfileSummaryResponse | null;
  versions: ProfileVersionItem[];
  loading: boolean;
  error: string | null;
};

// ---- storage keys ----

const KEYS = {
  profile: "ntgm.mobile.profile",
  versions: "ntgm.mobile.profileVersions",
  match: "ntgm.mobile.match",
  advice: "ntgm.mobile.advice",
  questionnaireDraft: "ntgm.mobile.questionnaireDraft",
  archiveTimeline: "ntgm.mobile.archiveTimeline",
  archiveChanges: "ntgm.mobile.archiveChanges",
} as const;

// ---- helpers ----

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---- mock data factories ----

function makeMockProfile(): ProfileSummaryResponse {
  return {
    profileId: randomId("prf"),
    userId: "usr_demo",
    profileVersion: 2,
    summary: {
      headline: "你的内核画像 V2",
      description: "基于八字与问答综合分析，你的内核特质表现为务实与创意兼备。",
    },
    personalityTraits: {
      openness: 0.82,
      conscientiousness: 0.65,
      extraversion: 0.48,
      agreeableness: 0.71,
      neuroticism: 0.39,
    },
    abilityTraits: {
      logic: 0.78,
      creativity: 0.85,
      leadership: 0.62,
      empathy: 0.88,
    },
    relationshipTraits: {
      family: 0.75,
      friendship: 0.68,
      romantic: 0.72,
      professional: 0.60,
    },
    fortuneTraits: {
      career: 0.70,
      wealth: 0.65,
      health: 0.80,
      study: 0.85,
    },
    confidenceMap: {
      personality: 0.90,
      ability: 0.75,
      relationship: 0.70,
      fortune: 0.60,
    },
    engineVersion: "v2.1.0",
  };
}

function makeMockVersions(): ProfileVersionItem[] {
  const now = new Date();
  return [
    {
      profileId: randomId("prf"),
      profileVersion: 1,
      summary: { headline: "初始画像 V1", description: "基于八字排盘与基础信息" },
      confidenceMap: { personality: 0.80, ability: 0.60, relationship: 0.55, fortune: 0.45 },
      engineVersion: "v1.0.0",
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      profileId: randomId("prf"),
      profileVersion: 2,
      summary: { headline: "画像 V2", description: "问答校准后更新" },
      confidenceMap: { personality: 0.90, ability: 0.75, relationship: 0.70, fortune: 0.60 },
      engineVersion: "v2.1.0",
      createdAt: now.toISOString(),
    },
  ];
}

function makeMockMatch(): MatchCurrentResponse {
  return {
    profileVersion: 2,
    topMatches: [
      {
        rank: 1,
        figureName: "曾国藩",
        similarityScore: 0.83,
        highlights: ["极强的自律性", "务实稳重", "人际关系经营高手"],
        differences: ["曾国藩更为内敛克制", "你更具创造力和艺术气质"],
      },
      {
        rank: 2,
        figureName: "王阳明",
        similarityScore: 0.71,
        highlights: ["知行合一的思想家", "内心力量强大", "善于反思"],
        differences: ["王阳明天资更为聪颖", "你在情感细腻度上更突出"],
      },
      {
        rank: 3,
        figureName: "苏轼",
        similarityScore: 0.65,
        highlights: ["乐观豁达的人生态度", "多才多艺", "人际魅力强"],
        differences: ["苏轼文学成就极高", "你更注重内在修养和长期规划"],
      },
    ],
    explanation: {
      summary: "你与曾国藩的特质最为接近，都是务实派，但你比他更具开放性和创造力。",
    },
  };
}

function makeMockAdvice(): AdviceCurrentResponse {
  return {
    adviceId: randomId("adv"),
    profileVersion: 2,
    summary: {
      shortTerm: {
        title: "短期建议（1-3个月）",
        items: [
          { dimension: "健康", text: "注意肝胆经络保养，早睡早起，减少熬夜" },
          { dimension: "人际", text: "本月贵人运佳，主动拓展社交圈会有意外收获" },
        ],
      },
      mediumTerm: {
        title: "中期建议（3-12个月）",
        items: [
          { dimension: "事业", text: "水运当值，适合学习新技能或转型，勿错失良机" },
          { dimension: "财富", text: "正财稳定，偏财有小的投资机会，保守为上" },
        ],
      },
      longTerm: {
        title: "长期建议（1-3年）",
        items: [
          { dimension: "人生", text: "火土流年适合建立稳定根基，婚恋/合作事宜可推进" },
          { dimension: "修行", text: "持续内观，修炼心性，命运轨迹将逐步改善" },
        ],
      },
    },
  } as any;
}

function makeMockQuestions(): QuestionnaireQuestion[] {
  return [
    {
      questionId: "q1",
      questionText: "你在陌生人面前，通常表现如何？",
      traitTargets: ["extraversion"],
      options: ["自然大方，很快熟络", "略有拘谨，需要时间", "安静观察，不主动", "看情况决定"],
    },
    {
      questionId: "q2",
      questionText: "面对重大决策时，你更倾向于？",
      traitTargets: ["conscientiousness"],
      options: ["理性分析利弊，逻辑优先", "相信直觉，随心而动", "听从信任的人建议", "先放一放，拖延决策"],
    },
    {
      questionId: "q3",
      questionText: "你对"逆天改命"的理解是？",
      traitTargets: ["openness"],
      options: ["通过努力改变既定的命运轨迹", "调整心态，接受不能改变的", "顺势而为，借势改运", "命天注定，改不了"],
    },
    {
      questionId: "q4",
      questionText: "你最看重的品质是？",
      traitTargets: ["agreeableness"],
      options: ["真诚与正直", "能力与成就", "智慧与见识", "温暖与包容"],
    },
    {
      questionId: "q5",
      questionText: "你的情绪波动通常因为什么？",
      traitTargets: ["neuroticism"],
      options: ["压力和责任", "人际冲突或冷落", "目标受挫或失败", "身体疲惫或睡眠不足"],
    },
  ];
}

function makeMockProgress(): QuestionnaireProgressResponse {
  return {
    totalGroups: 3,
    totalQuestions: 15,
    groups: [
      { group: "basic", label: "基础特质", count: 5 },
      { group: "social", label: "社交模式", count: 5 },
      { group: "values", label: "价值观念", count: 5 },
    ],
  };
}

function makeMockTimeline(): ArchiveTimelineItem[] {
  const now = new Date();
  return [
    {
      itemType: "intake",
      occurredAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      title: "完成初始建档",
      summary: "提交基础资料，生成初始八字排盘",
      profileVersion: 1,
      metadata: { type: "建档" },
    },
    {
      itemType: "profile_change",
      occurredAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      title: "画像 V1 → V2 演进",
      summary: "完成 5 道问答题，画像置信度提升",
      profileVersion: 2,
      metadata: { from: 1, to: 2, trigger: "questionnaire" },
    },
    {
      itemType: "advice",
      occurredAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      title: "获取改命建议 V1",
      summary: "短期/中期/长期建议已生成",
      profileVersion: 2,
      metadata: { adviceVersion: 1 },
    },
    {
      itemType: "match",
      occurredAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      title: "历史人物匹配完成",
      summary: "Top 3 匹配：曾国藩、王阳明、苏轼",
      profileVersion: 2,
      metadata: {},
    },
    {
      itemType: "event",
      occurredAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      title: "录入人生事件",
      summary: "记录了一次重要的人生转折事件",
      profileVersion: 2,
      metadata: { eventType: "career" },
    },
  ];
}

function makeMockChanges() {
  return [
    {
      changeId: randomId("chl"),
      fromVersion: 1,
      toVersion: 2,
      changedDimensions: {
        raised: ["openness", "empathy"],
        lowered: ["neuroticism"],
        topDiffs: [
          { dimension: "openness", previousValue: 0.70, currentValue: 0.82, delta: 0.12, direction: "up" },
          { dimension: "empathy", previousValue: 0.75, currentValue: 0.88, delta: 0.13, direction: "up" },
          { dimension: "neuroticism", previousValue: 0.52, currentValue: 0.39, delta: -0.13, direction: "down" },
        ],
        uncertainDimensions: ["leadership"],
      },
      reasonSummary: {
        headline: "问答校准后，开放性和共情力显著提升",
        trigger: "questionnaire_answers",
        newEvidence: ["Q1: 自然大方", "Q4: 重视真诚", "Q3: 通过努力改变命运"],
        evidenceDelta: { openness: 0.12, agreeableness: 0.05, neuroticism: -0.13 },
      },
      createdAt: new Date().toISOString(),
    },
  ];
}

// ---- MobileApiClient class ----

class MobileApiClient {
  private mode: "mock" | "http" = "mock";
  private baseUrl: string | null = null;
  private authToken: string | null = null;

  enable(baseUrl: string, authToken: string | null = null) {
    this.mode = "http";
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.authToken = authToken;
  }

  disable() {
    this.mode = "mock";
    this.baseUrl = null;
    this.authToken = null;
  }

  getMode(): "mock" | "http" {
    return this.mode;
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
    };
  }

  // ---- profile ----

  async fetchCurrentProfile(): Promise<ProfileSummaryResponse> {
    if (this.mode === "mock") {
      await sleep(300);
      return readJson<ProfileSummaryResponse>(KEYS.profile, makeMockProfile());
    }
    try {
      const res = await fetch(`${this.baseUrl}/profiles/current`, { headers: this.headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ProfileSummaryResponse;
      await writeJson(KEYS.profile, data);
      return data;
    } catch {
      return readJson<ProfileSummaryResponse>(KEYS.profile, makeMockProfile());
    }
  }

  async fetchProfileVersions(): Promise<ProfileVersionItem[]> {
    if (this.mode === "mock") {
      await sleep(200);
      return readJson<ProfileVersionItem[]>(KEYS.versions, makeMockVersions());
    }
    try {
      const res = await fetch(`${this.baseUrl}/profiles/versions`, { headers: this.headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { items: ProfileVersionItem[] };
      await writeJson(KEYS.versions, data.items);
      return data.items;
    } catch {
      return readJson<ProfileVersionItem[]>(KEYS.versions, makeMockVersions());
    }
  }

  async saveProfile(profile: ProfileSummaryResponse): Promise<void> {
    await writeJson(KEYS.profile, profile);
  }

  // ---- match ----

  async fetchCurrentMatch(): Promise<MatchCurrentResponse> {
    if (this.mode === "mock") {
      await sleep(400);
      return readJson<MatchCurrentResponse>(KEYS.match, makeMockMatch());
    }
    try {
      const res = await fetch(`${this.baseUrl}/matches/current`, { headers: this.headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as MatchCurrentResponse;
      await writeJson(KEYS.match, data);
      return data;
    } catch {
      return readJson<MatchCurrentResponse>(KEYS.match, makeMockMatch());
    }
  }

  // ---- advice ----

  async fetchCurrentAdvice(): Promise<AdviceCurrentResponse> {
    if (this.mode === "mock") {
      await sleep(350);
      return readJson<AdviceCurrentResponse>(KEYS.advice, makeMockAdvice());
    }
    try {
      const res = await fetch(`${this.baseUrl}/advice/current`, { headers: this.headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as AdviceCurrentResponse;
      await writeJson(KEYS.advice, data);
      return data;
    } catch {
      return readJson<AdviceCurrentResponse>(KEYS.advice, makeMockAdvice());
    }
  }

  async submitAdviceFeedback(
    feedbackType: string,
    feedbackText?: string
  ): Promise<{ success: boolean; message: string }> {
    if (this.mode === "mock") {
      await sleep(200);
      return { success: true, message: "反馈已收到，感谢你的参与" };
    }
    try {
      const res = await fetch(`${this.baseUrl}/advice/feedback`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ feedbackType, feedbackText }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as { success: boolean; message: string };
    } catch {
      return { success: true, message: "反馈已本地记录" };
    }
  }

  // ---- questionnaire ----

  async fetchNextQuestions(): Promise<QuestionnaireQuestion[]> {
    if (this.mode === "mock") {
      await sleep(300);
      return readJson<QuestionnaireQuestion[]>(KEYS.questionnaireDraft + "_questions", makeMockQuestions());
    }
    try {
      const res = await fetch(`${this.baseUrl}/questionnaire/next`, { headers: this.headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { questions: QuestionnaireQuestion[] };
      return data.questions;
    } catch {
      return makeMockQuestions();
    }
  }

  async fetchQuestionnaireProgress(): Promise<QuestionnaireProgressResponse> {
    if (this.mode === "mock") {
      await sleep(100);
      return makeMockProgress();
    }
    try {
      const res = await fetch(`${this.baseUrl}/questionnaire/progress`, { headers: this.headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as QuestionnaireProgressResponse;
    } catch {
      return makeMockProgress();
    }
  }

  async submitQuestionnaireAnswers(
    answers: QuestionnaireAnswerItem[]
  ): Promise<{ jobId: string; profileVersion: number }> {
    if (this.mode === "mock") {
      await sleep(500);
      const profile = await this.fetchCurrentProfile();
      const updated = { ...profile, profileVersion: profile.profileVersion + 1 };
      await this.saveProfile(updated);
      return { jobId: randomId("job"), profileVersion: updated.profileVersion };
    }
    try {
      const res = await fetch(`${this.baseUrl}/questionnaire/answers`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { jobId: string; profileVersion: number };
      await this.fetchCurrentProfile();
      return data;
    } catch {
      return { jobId: randomId("job"), profileVersion: 2 };
    }
  }

  async saveQuestionnaireDraft(state: QuestionnaireState): Promise<void> {
    await writeJson(KEYS.questionnaireDraft, state);
  }

  async loadQuestionnaireDraft(): Promise<QuestionnaireState | null> {
    return readJson<QuestionnaireState | null>(KEYS.questionnaireDraft, null);
  }

  // ---- archive ----

  async fetchArchiveTimeline(): Promise<ArchiveTimelineItem[]> {
    if (this.mode === "mock") {
      await sleep(300);
      return readJson<ArchiveTimelineItem[]>(KEYS.archiveTimeline, makeMockTimeline());
    }
    try {
      const res = await fetch(`${this.baseUrl}/archive/timeline`, { headers: this.headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { items: ArchiveTimelineItem[] };
      await writeJson(KEYS.archiveTimeline, data.items);
      return data.items;
    } catch {
      return makeMockTimeline();
    }
  }

  async fetchArchiveChanges() {
    if (this.mode === "mock") {
      await sleep(200);
      return readJson(KEYS.archiveChanges, makeMockChanges());
    }
    try {
      const res = await fetch(`${this.baseUrl}/archive/changes`, { headers: this.headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { items: any[] };
      await writeJson(KEYS.archiveChanges, data.items);
      return data.items;
    } catch {
      return makeMockChanges();
    }
  }
}

export const ntgmApi = new MobileApiClient();
