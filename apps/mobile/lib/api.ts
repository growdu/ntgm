/**
 * mobile shared lib — 给 RN 用
 *
 * 设计:
 * - 用 AsyncStorage 代替 localStorage
 * - mockApi/auth/plan-guard 全部 RN 安全（无 window/document）
 * - 算法与 web 一致，但 store 不同
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export type Plan = "free" | "pro" | "master";

export type AccountUser = {
  userId: string;
  email: string;
  displayName: string;
  plan: Plan;
  createdAt: string;
};

export type PricingPlan = {
  id: Plan;
  name: string;
  description: string;
  priceCents: number;
  currency: "CNY";
  features: string[];
  highlight?: boolean;
  badge?: string;
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "免费尝鲜",
    description: "先看看，再决定要不要付费",
    priceCents: 0,
    currency: "CNY",
    features: ["完整八字与基础画像", "1 次历史人物匹配", "3 条建议浏览"],
  },
  {
    id: "pro",
    name: "Pro 进阶",
    description: "持续画像 + 创作",
    priceCents: 3900,
    currency: "CNY",
    badge: "最受欢迎",
    highlight: true,
    features: [
      "免费版所有功能",
      "持续画像自动演进",
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
      "API 接入能力",
      "优先客服支持",
    ],
  },
];

export class MobileApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "MobileApiError";
  }
}

const STORAGE_KEYS = {
  users: "ntgm.mobile.users",
  session: "ntgm.mobile.session",
} as const;

type StoredUser = AccountUser & { passwordHash: string };

function hashPassword(pw: string): string {
  let h = 0;
  for (let i = 0; i < pw.length; i++) {
    h = (h << 5) - h + pw.charCodeAt(i);
    h |= 0;
  }
  return `mobile_${Math.abs(h).toString(36)}_${pw.length}`;
}

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
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function signup(req: {
  email: string;
  password: string;
  displayName: string;
}): Promise<AccountUser> {
  await sleep(300);
  const email = req.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new MobileApiError("invalid_email", "邮箱格式不正确");
  }
  if (req.password.length < 6) {
    throw new MobileApiError("weak_password", "密码至少需要 6 位");
  }
  if (!req.displayName.trim()) {
    throw new MobileApiError("missing_name", "请填写昵称");
  }

  const users = await readJson<StoredUser[]>(STORAGE_KEYS.users, []);
  if (users.some((u) => u.email === email)) {
    throw new MobileApiError("email_taken", "该邮箱已注册，请直接登录");
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
  await writeJson(STORAGE_KEYS.users, users);
  await writeJson(STORAGE_KEYS.session, {
    userId: user.userId,
    token: `tok_${user.userId}`,
  });
  const { passwordHash, ...pub } = user;
  void passwordHash;
  return pub;
}

export async function login(req: {
  email: string;
  password: string;
}): Promise<AccountUser> {
  await sleep(300);
  const email = req.email.trim().toLowerCase();
  const users = await readJson<StoredUser[]>(STORAGE_KEYS.users, []);
  const user = users.find((u) => u.email === email);
  if (!user) {
    throw new MobileApiError("not_found", "账号不存在");
  }
  if (user.passwordHash !== hashPassword(req.password)) {
    throw new MobileApiError("wrong_password", "密码错误");
  }
  await writeJson(STORAGE_KEYS.session, {
    userId: user.userId,
    token: `tok_${user.userId}`,
  });
  const { passwordHash, ...pub } = user;
  void passwordHash;
  return pub;
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.session);
}

export async function getCurrentUser(): Promise<AccountUser | null> {
  const session = await readJson<{ userId: string } | null>(
    STORAGE_KEYS.session,
    null
  );
  if (!session) return null;
  const users = await readJson<StoredUser[]>(STORAGE_KEYS.users, []);
  const user = users.find((u) => u.userId === session.userId);
  if (!user) return null;
  const { passwordHash, ...pub } = user;
  void passwordHash;
  return pub;
}

export async function updateUserPlan(plan: Plan): Promise<AccountUser | null> {
  const session = await readJson<{ userId: string } | null>(
    STORAGE_KEYS.session,
    null
  );
  if (!session) return null;
  const users = await readJson<StoredUser[]>(STORAGE_KEYS.users, []);
  const idx = users.findIndex((u) => u.userId === session.userId);
  if (idx < 0) return null;
  users[idx] = { ...users[idx], plan };
  await writeJson(STORAGE_KEYS.users, users);
  const { passwordHash, ...pub } = users[idx];
  void passwordHash;
  return pub;
}

export async function ensureDemoUser(): Promise<void> {
  const users = await readJson<StoredUser[]>(STORAGE_KEYS.users, []);
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
  await writeJson(STORAGE_KEYS.users, users);
}

export async function mockCheckout(planId: Plan): Promise<AccountUser | null> {
  await sleep(400);
  if (planId === "free") return getCurrentUser();
  return updateUserPlan(planId);
}

// 检查用户是否完成过 onboarding（mobile 端判断依据）
export async function checkOnboarded(): Promise<boolean> {
  const u = await getCurrentUser();
  if (!u) return false;
  // mock 账户（demo@ntgm.app）默认未建档，便于演示流程
  if (u.email === "demo@ntgm.app") return false;
  return true;
}
