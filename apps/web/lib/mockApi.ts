/**
 * Mock API layer — 前端 mock 后端逻辑
 *
 * 设计原则:
 * - 全部走 localStorage 模拟后端
 * - 真实接口一旦就绪，函数实现替换即可
 * - 故意模拟 200-500ms 网络延迟
 * - 故意保留可观察的错误（弱密码、重复邮箱、付费限制等）
 *
 * 这一层是 D_landing_first 决策的核心 —— 验证前端流程足够
 */

import type {
  AccountUser,
  AuthResponse,
  CreateWorkRequest,
  CreateWorkResponse,
  ListWorksResponse,
  LoginRequest,
  Plan,
  PricingPlan,
  SignupRequest,
  Work,
} from "@ntgm/sdk";

const STORAGE_KEYS = {
  users: "ntgm.mock.users",
  session: "ntgm.mock.session",
  works: "ntgm.mock.works",
  orders: "ntgm.mock.orders",
  resetTokens: "ntgm.mock.resetTokens",
  verifyTokens: "ntgm.mock.verifyTokens",
  emailVerified: "ntgm.mock.emailVerified",
} as const;

const MOCK_DELAY_MS = 350;

// ============================================
// 内部工具
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

type StoredUser = AccountUser & { passwordHash: string };

// 简单 hash 模拟（绝不能用于生产）
function hashPassword(pw: string): string {
  let h = 0;
  for (let i = 0; i < pw.length; i++) {
    h = (h << 5) - h + pw.charCodeAt(i);
    h |= 0;
  }
  return `mock_${Math.abs(h).toString(36)}_${pw.length}`;
}

// ============================================
// 错误类型
// ============================================

export class MockApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "MockApiError";
  }
}

// ============================================
// Auth
// ============================================

function getUsers(): StoredUser[] {
  return readJson<StoredUser[]>(STORAGE_KEYS.users, []);
}

function saveUsers(users: StoredUser[]): void {
  writeJson(STORAGE_KEYS.users, users);
}

export async function signup(req: SignupRequest): Promise<AuthResponse> {
  await sleep(MOCK_DELAY_MS);

  const email = req.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new MockApiError("invalid_email", "邮箱格式不正确");
  }
  if (req.password.length < 6) {
    throw new MockApiError("weak_password", "密码至少需要 6 位");
  }
  if (!req.displayName.trim()) {
    throw new MockApiError("missing_name", "请填写昵称");
  }

  const users = getUsers();
  if (users.some((u) => u.email === email)) {
    throw new MockApiError("email_taken", "该邮箱已注册，请直接登录");
  }

  const now = new Date().toISOString();
  const user: StoredUser = {
    userId: randomId("usr"),
    email,
    displayName: req.displayName.trim(),
    plan: "free",
    createdAt: now,
    passwordHash: hashPassword(req.password),
  };
  users.push(user);
  saveUsers(users);

  const token = `tok_${user.userId}_${Date.now().toString(36)}`;
  writeJson(STORAGE_KEYS.session, { token, userId: user.userId });

  const { passwordHash, ...publicUser } = user;
  void passwordHash;
  return { user: publicUser, token };
}

export async function login(req: LoginRequest): Promise<AuthResponse> {
  await sleep(MOCK_DELAY_MS);

  const email = req.email.trim().toLowerCase();
  const users = getUsers();
  const user = users.find((u) => u.email === email);

  // 演示账户：任意密码都能进（已注册）
  if (!user) {
    throw new MockApiError("not_found", "账号不存在，请先注册");
  }
  if (user.passwordHash !== hashPassword(req.password)) {
    throw new MockApiError("wrong_password", "密码错误");
  }

  const token = `tok_${user.userId}_${Date.now().toString(36)}`;
  writeJson(STORAGE_KEYS.session, { token, userId: user.userId });

  const { passwordHash, ...publicUser } = user;
  void passwordHash;
  return { user: publicUser, token };
}

export function logout(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEYS.session);
}

export function getCurrentUser(): AccountUser | null {
  const session = readJson<{ userId: string } | null>(
    STORAGE_KEYS.session,
    null
  );
  if (!session) return null;
  const user = getUsers().find((u) => u.userId === session.userId);
  if (!user) return null;
  const { passwordHash, ...publicUser } = user;
  void passwordHash;
  return publicUser;
}

export function updateUserPlan(userId: string, plan: Plan): AccountUser | null {
  const users = getUsers();
  const idx = users.findIndex((u) => u.userId === userId);
  if (idx < 0) return null;
  users[idx] = { ...users[idx], plan };
  saveUsers(users);
  const { passwordHash, ...publicUser } = users[idx];
  void passwordHash;
  return publicUser;
}

// ============================================
// 演示账户自动注入
// ============================================

export function ensureDemoUser(): void {
  if (typeof window === "undefined") return;
  const users = getUsers();
  if (users.some((u) => u.email === "demo@ntgm.app")) return;

  const now = new Date().toISOString();
  users.push({
    userId: "usr_demo_seed",
    email: "demo@ntgm.app",
    displayName: "演示用户",
    plan: "free",
    createdAt: now,
    passwordHash: hashPassword("demo123"),
  });
  saveUsers(users);
}

// ============================================
// Pricing & Payment
// ============================================

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "免费尝鲜",
    description: "先看看，再决定要不要付费",
    priceCents: 0,
    currency: "CNY",
    features: ["完整八字与基础画像", "1 次历史人物匹配", "3 条建议浏览"],
    excludedFeatures: [
      "持续画像自动演进",
      "创作发布与被看见",
      "导出 PDF / 海报",
    ],
  },
  {
    id: "pro",
    name: "Pro 进阶",
    description: "持续画像 + 创作，适合长期使用",
    priceCents: 3900,
    currency: "CNY",
    badge: "最受欢迎",
    highlight: true,
    features: [
      "免费版所有功能",
      "持续画像自动演进（每日 1 次）",
      "历史人物匹配无限次",
      "完整建议 + 反馈机制",
      "成长档案时间线无限",
      "PDF 报告 + 分享海报",
      "创作 / 发布 / 互动",
    ],
  },
  {
    id: "master",
    name: "Master 大师",
    description: "深度定制 + 优先支持",
    priceCents: 9900,
    currency: "CNY",
    features: [
      "Pro 全部功能",
      "画像演进无次数限制",
      "1V1 解读预约（每月 1 次）",
      "专属大师解读 PDF",
      "API 接入能力（自建应用）",
      "优先客服支持",
    ],
  },
];

export function getPricingPlans(): PricingPlan[] {
  return PRICING_PLANS;
}

type StoredOrder = {
  orderId: string;
  userId: string;
  planId: Plan;
  amountCents: number;
  status: "pending" | "paid" | "failed" | "refunded";
  createdAt: string;
  paidAt: string | null;
};

function getOrders(): StoredOrder[] {
  return readJson<StoredOrder[]>(STORAGE_KEYS.orders, []);
}

function saveOrders(orders: StoredOrder[]): void {
  writeJson(STORAGE_KEYS.orders, orders);
}

export async function createCheckout(
  planId: Plan,
  paymentMethod: "wechat" | "alipay" | "card"
): Promise<{ checkoutId: string; redirectUrl: string; expiresAt: string }> {
  await sleep(MOCK_DELAY_MS);
  const user = getCurrentUser();
  if (!user) {
    throw new MockApiError("not_authenticated", "请先登录后购买");
  }
  if (planId === "free") {
    throw new MockApiError("free_no_purchase", "免费版无需购买");
  }

  const plan = PRICING_PLANS.find((p) => p.id === planId);
  if (!plan) throw new MockApiError("plan_not_found", "套餐不存在");

  const orders = getOrders();
  const order: StoredOrder = {
    orderId: randomId("ord"),
    userId: user.userId,
    planId,
    amountCents: plan.priceCents,
    status: "pending",
    createdAt: new Date().toISOString(),
    paidAt: null,
  };
  orders.push(order);
  saveOrders(orders);

  // mock 支付成功：直接置 paid 并升级 plan
  // 真接 Stripe 时此处应返回 redirectUrl
  const updated = updateUserPlan(user.userId, planId);
  if (updated) {
    order.status = "paid";
    order.paidAt = new Date().toISOString();
    saveOrders(orders);
  }

  return {
    checkoutId: order.orderId,
    redirectUrl: `/create?paid=${planId}`,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
}

export async function confirmCheckout(orderId: string): Promise<StoredOrder> {
  await sleep(MOCK_DELAY_MS);
  const orders = getOrders();
  const idx = orders.findIndex((o) => o.orderId === orderId);
  if (idx < 0) throw new MockApiError("order_not_found", "订单不存在");
  return orders[idx];
}

// ============================================
// Works (创作)
// ============================================

const SEED_WORKS: Work[] = [
  {
    workId: "wk_seed_1",
    authorId: "usr_seed_other",
    authorName: "墨白先生",
    title: "我用了三个月，看清了自己的命格",
    body: "所谓持续画像，不是一次算命就完事，而是把日常的小决定、纠结、心境都喂给它，让它告诉你：你以为的你，不是全部的你。",
    tags: ["随笔", "成长"],
    visibility: "public",
    likes: 128,
    views: 1024,
    createdAt: new Date(Date.now() - 7 * 86400_000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 86400_000).toISOString(),
  },
  {
    workId: "wk_seed_2",
    authorId: "usr_seed_other2",
    authorName: "清夜",
    title: "命里缺火，所以我开始跑步",
    body: "算法说我的命格偏寒，那我就去补。三个月后我没成为运动员，但睡眠好了一截。",
    tags: ["实践", "运动"],
    visibility: "public",
    likes: 64,
    views: 512,
    createdAt: new Date(Date.now() - 3 * 86400_000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400_000).toISOString(),
  },
];

function getWorksStore(): Work[] {
  const stored = readJson<Work[] | null>(STORAGE_KEYS.works, null);
  if (stored === null) {
    writeJson(STORAGE_KEYS.works, SEED_WORKS);
    return SEED_WORKS;
  }
  return stored;
}

function saveWorksStore(works: Work[]): void {
  writeJson(STORAGE_KEYS.works, works);
}

export async function listWorks(): Promise<ListWorksResponse> {
  await sleep(MOCK_DELAY_MS);
  const works = getWorksStore()
    .filter((w) => w.visibility === "public")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { works, total: works.length };
}

export async function createWork(
  req: CreateWorkRequest
): Promise<CreateWorkResponse> {
  await sleep(MOCK_DELAY_MS);
  const user = getCurrentUser();
  if (!user) {
    throw new MockApiError("not_authenticated", "请先登录后创作");
  }
  if (user.plan === "free") {
    throw new MockApiError(
      "plan_insufficient",
      "创作功能需要 Pro 或 Master 套餐，请升级后继续"
    );
  }
  if (!req.title.trim()) {
    throw new MockApiError("missing_title", "请填写标题");
  }
  if (!req.body.trim() || req.body.trim().length < 20) {
    throw new MockApiError("body_too_short", "正文至少 20 字");
  }

  const now = new Date().toISOString();
  const work: Work = {
    workId: randomId("wk"),
    authorId: user.userId,
    authorName: user.displayName,
    title: req.title.trim(),
    body: req.body.trim(),
    tags: req.tags ?? [],
    visibility: req.visibility ?? "public",
    likes: 0,
    views: 0,
    createdAt: now,
    updatedAt: now,
  };

  const works = getWorksStore();
  works.unshift(work);
  saveWorksStore(works);
  return { work };
}

// ============================================
// Password Reset
// ============================================

type ResetToken = {
  token: string;
  userId: string;
  expiresAt: number;
  used: boolean;
};

function getResetTokens(): ResetToken[] {
  return readJson<ResetToken[]>(STORAGE_KEYS.resetTokens, []);
}

function saveResetTokens(tokens: ResetToken[]): void {
  writeJson(STORAGE_KEYS.resetTokens, tokens);
}

export async function requestPasswordReset(email: string): Promise<{
  resetUrl: string;
  token: string;
}> {
  await sleep(MOCK_DELAY_MS);
  const normalized = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    throw new MockApiError("invalid_email", "邮箱格式不正确");
  }

  const user = getUsers().find((u) => u.email === normalized);
  // 出于安全考虑：不论邮箱是否存在都返回成功
  // 真实场景下不暴露用户存在性
  if (!user) {
    return { resetUrl: "", token: "" };
  }

  const token = `rst_${randomId("tk")}`;
  const tokens = getResetTokens();
  tokens.push({
    token,
    userId: user.userId,
    expiresAt: Date.now() + 30 * 60 * 1000,
    used: false,
  });
  saveResetTokens(tokens);

  return {
    token,
    resetUrl: `/reset?token=${encodeURIComponent(token)}`,
  };
}

export async function confirmPasswordReset(
  token: string,
  newPassword: string
): Promise<AccountUser> {
  await sleep(MOCK_DELAY_MS);
  if (newPassword.length < 6) {
    throw new MockApiError("weak_password", "密码至少需要 6 位");
  }
  const tokens = getResetTokens();
  const record = tokens.find((t) => t.token === token);
  if (!record) {
    throw new MockApiError("invalid_token", "重置链接无效或已过期");
  }
  if (record.used) {
    throw new MockApiError("token_used", "该重置链接已被使用");
  }
  if (record.expiresAt < Date.now()) {
    throw new MockApiError("token_expired", "重置链接已过期，请重新申请");
  }

  const users = getUsers();
  const idx = users.findIndex((u) => u.userId === record.userId);
  if (idx < 0) {
    throw new MockApiError("user_not_found", "用户不存在");
  }

  users[idx] = { ...users[idx], passwordHash: hashPassword(newPassword) };
  saveUsers(users);
  record.used = true;
  saveResetTokens(tokens);

  const { passwordHash, ...publicUser } = users[idx];
  void passwordHash;
  return publicUser;
}

// ============================================
// Email Verify
// ============================================

type VerifyToken = {
  token: string;
  userId: string;
  expiresAt: number;
  used: boolean;
};

function getVerifyTokens(): VerifyToken[] {
  return readJson<VerifyToken[]>(STORAGE_KEYS.verifyTokens, []);
}

function saveVerifyTokens(tokens: VerifyToken[]): void {
  writeJson(STORAGE_KEYS.verifyTokens, tokens);
}

function getEmailVerifiedSet(): string[] {
  return readJson<string[]>(STORAGE_KEYS.emailVerified, []);
}

function isEmailVerified(userId: string): boolean {
  return getEmailVerifiedSet().includes(userId);
}

export function isCurrentUserEmailVerified(): boolean {
  const u = getCurrentUser();
  if (!u) return false;
  return isEmailVerified(u.userId);
}

export async function sendVerifyEmail(): Promise<{
  verifyUrl: string;
  token: string;
}> {
  await sleep(MOCK_DELAY_MS);
  const user = getCurrentUser();
  if (!user) {
    throw new MockApiError("not_authenticated", "请先登录");
  }

  const token = `vrf_${randomId("tk")}`;
  const tokens = getVerifyTokens();
  tokens.push({
    token,
    userId: user.userId,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    used: false,
  });
  saveVerifyTokens(tokens);

  return {
    token,
    verifyUrl: `/verify?token=${encodeURIComponent(token)}`,
  };
}

export async function confirmEmailVerify(token: string): Promise<AccountUser> {
  await sleep(MOCK_DELAY_MS);
  const tokens = getVerifyTokens();
  const record = tokens.find((t) => t.token === token);
  if (!record) {
    throw new MockApiError("invalid_token", "验证链接无效");
  }
  if (record.used) {
    throw new MockApiError("token_used", "该链接已使用");
  }
  if (record.expiresAt < Date.now()) {
    throw new MockApiError("token_expired", "链接已过期");
  }

  record.used = true;
  saveVerifyTokens(tokens);

  const verified = getEmailVerifiedSet();
  if (!verified.includes(record.userId)) {
    verified.push(record.userId);
    writeJson(STORAGE_KEYS.emailVerified, verified);
  }

  const users = getUsers();
  const idx = users.findIndex((u) => u.userId === record.userId);
  if (idx < 0) {
    throw new MockApiError("user_not_found", "用户不存在");
  }
  const { passwordHash, ...publicUser } = users[idx];
  void passwordHash;
  return publicUser;
}

// ============================================
// Work 编辑/删除
// ============================================

export async function updateWork(
  workId: string,
  patch: {
    title?: string;
    body?: string;
    tags?: string[];
    visibility?: "public" | "private";
  }
): Promise<Work> {
  await sleep(MOCK_DELAY_MS);
  const user = getCurrentUser();
  if (!user) {
    throw new MockApiError("not_authenticated", "请先登录");
  }
  const works = getWorksStore();
  const idx = works.findIndex((w) => w.workId === workId);
  if (idx < 0) {
    throw new MockApiError("work_not_found", "作品不存在");
  }
  if (works[idx].authorId !== user.userId) {
    throw new MockApiError("forbidden", "只能编辑自己的作品");
  }
  const updated: Work = {
    ...works[idx],
    title: patch.title?.trim() ?? works[idx].title,
    body: patch.body?.trim() ?? works[idx].body,
    tags: patch.tags ?? works[idx].tags,
    visibility: patch.visibility ?? works[idx].visibility,
    updatedAt: new Date().toISOString(),
  };
  works[idx] = updated;
  saveWorksStore(works);
  return updated;
}

export async function deleteWork(workId: string): Promise<void> {
  await sleep(MOCK_DELAY_MS);
  const user = getCurrentUser();
  if (!user) {
    throw new MockApiError("not_authenticated", "请先登录");
  }
  const works = getWorksStore();
  const idx = works.findIndex((w) => w.workId === workId);
  if (idx < 0) {
    throw new MockApiError("work_not_found", "作品不存在");
  }
  if (works[idx].authorId !== user.userId) {
    throw new MockApiError("forbidden", "只能删除自己的作品");
  }
  works.splice(idx, 1);
  saveWorksStore(works);
}

// ============================================
// Draft（草稿自动保存）
// ============================================

const DRAFT_KEY = "ntgm.mock.draft";

export type Draft = {
  title: string;
  body: string;
  tagsRaw: string;
  savedAt: string;
};

export function loadDraft(userId: string): Draft | null {
  const all = readJson<Record<string, Draft>>("ntgm.mock.drafts", {});
  return all[userId] ?? null;
}

export function saveDraft(userId: string, draft: Omit<Draft, "savedAt">): void {
  const all = readJson<Record<string, Draft>>("ntgm.mock.drafts", {});
  all[userId] = { ...draft, savedAt: new Date().toISOString() };
  writeJson("ntgm.mock.drafts", all);
}

export function clearDraft(userId: string): void {
  const all = readJson<Record<string, Draft>>("ntgm.mock.drafts", {});
  delete all[userId];
  writeJson("ntgm.mock.drafts", all);
  void DRAFT_KEY;
}

// ============================================
// AI 辅助写作
// ============================================

export type AiAssistMode = "continue" | "polish" | "expand" | "summarize";

const AI_USAGE_KEY = "ntgm.mock.aiUsage";

type AiUsage = {
  // yyyy-mm-dd
  date: string;
  count: number;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getUsage(userId: string): AiUsage {
  const all = readJson<Record<string, AiUsage>>(AI_USAGE_KEY, {});
  return all[userId] ?? { date: todayKey(), count: 0 };
}

function saveUsage(userId: string, usage: AiUsage): void {
  const all = readJson<Record<string, AiUsage>>(AI_USAGE_KEY, {});
  all[userId] = usage;
  writeJson(AI_USAGE_KEY, all);
}

export function getAiUsage(userId: string): AiUsage {
  const u = getUsage(userId);
  if (u.date !== todayKey()) {
    return { date: todayKey(), count: 0 };
  }
  return u;
}

const PLAN_AI_DAILY_QUOTA: Record<Plan, number | "unlimited"> = {
  free: 0,
  pro: 5,
  master: "unlimited",
};

export function getAiQuotaForPlan(plan: Plan): number | "unlimited" {
  return PLAN_AI_DAILY_QUOTA[plan];
}

export async function aiAssist(
  text: string,
  mode: AiAssistMode
): Promise<{ result: string; remaining: number | "unlimited" }> {
  await sleep(800); // 模拟模型耗时

  const user = getCurrentUser();
  if (!user) {
    throw new MockApiError("not_authenticated", "请先登录");
  }
  const quota = PLAN_AI_DAILY_QUOTA[user.plan];
  if (quota === 0) {
    throw new MockApiError(
      "plan_insufficient",
      "AI 辅助写作需要 Pro 或 Master 套餐，请升级后使用"
    );
  }
  const usage = getUsage(user.userId);
  if (quota !== "unlimited" && usage.count >= quota) {
    throw new MockApiError(
      "quota_exceeded",
      `今日 AI 次数已用完（${quota}/天）。明日 0 点重置。`
    );
  }

  const result = generateMockAiText(text, mode);

  // 计入用量
  const next: AiUsage = {
    date: todayKey(),
    count: usage.count + 1,
  };
  saveUsage(user.userId, next);

  const remaining =
    quota === "unlimited" ? "unlimited" : Math.max(0, quota - next.count);
  return { result, remaining };
}

// ----- 规则引擎（mock LLM） -----
function generateMockAiText(input: string, mode: AiAssistMode): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "（没有可处理的内容）";
  }
  switch (mode) {
    case "continue": {
      const samples = [
        "继而看命主当下处境：上有愿景未竟，下有现实羁绊，中间有焦虑。",
        "若从更深的维度观察，会发现这并非孤立事件，而是过去积累的某种模式。",
        "这件事看似偶然，实则与数年前的某个选择遥相呼应。",
        "更耐人寻味的是，命主在处理类似情境时的本能反应——它指向一个长期特质。",
      ];
      return "\n\n" + samples[Math.floor(Math.random() * samples.length)];
    }
    case "polish": {
      // 简单：把空行规整、句首补全
      return trimmed
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => (line.length < 8 ? line + "。" : line))
        .join("\n");
    }
    case "expand": {
      const expansions = [
        "从五行角度看，这种倾向与命主的喜忌神有关。",
        "结合大运流年，这一特质在最近 3-5 年表现尤其明显。",
        "若用历史人物类比，更接近苏轼面对人生起伏时的态度——既不回避，也不强求。",
      ];
      return trimmed + "\n\n" + expansions.slice(0, 2).join("\n\n");
    }
    case "summarize": {
      const first = trimmed.split(/[。\n!?]/)[0] ?? trimmed.slice(0, 30);
      return `核心观点：${first.trim()}。\n（演示模式总结较简，真接 LLM 时会做更深入归纳）`;
    }
  }
}
