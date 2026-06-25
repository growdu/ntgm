/**
 * 推送通知 — 抽象层
 *
 * - registerForPush: 拿 Expo Push Token，存到 AsyncStorage
 * - scheduleLocalReminder: 本地定时通知
 * - 不可用时降级 mock
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  NotificationPref,
  PushTokenRecord,
  ReminderItem,
} from "@ntgm/sdk";
import {
  getDeviceName,
  getDevicePlatform,
  getNotificationPermission,
  probeNative,
  requestNotificationPermission,
} from "./permissions";
import { getCurrentUser } from "./api";

const TOKEN_KEY = "ntgm.mobile.pushTokens";
const PREF_KEY = "ntgm.mobile.notifPrefs";
const REMINDER_KEY = "ntgm.mobile.reminders";

const DEFAULT_PREF: NotificationPref = {
  pushEnabled: false,
  dailyReminder: true,
  weeklyDigest: false,
  marketingNews: false,
};

// ---------- 内部工具 ----------

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
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

// ---------- 权限 ----------

export type PermResult = {
  status: "granted" | "denied" | "undetermined";
  canAskAgain: boolean;
  mock: boolean;
};

export async function ensureNotificationPermission(): Promise<PermResult> {
  let perm = await getNotificationPermission();
  if (perm.status === "undetermined" && perm.canAskAgain) {
    perm = await requestNotificationPermission();
  }
  return perm;
}

// ---------- Push token ----------

export async function getStoredPushTokens(): Promise<PushTokenRecord[]> {
  return readJson<PushTokenRecord[]>(TOKEN_KEY, []);
}

export async function registerForPush(): Promise<PushTokenRecord | null> {
  await sleep(500);
  const perm = await ensureNotificationPermission();
  if (perm.status !== "granted") return null;

  const p = probeNative();
  if (!p.notifications) {
    // mock token
    return saveMockToken();
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const notif = require("expo-notifications");
    // 设置默认 channel (Android)
    if (notif.setNotificationHandler) {
      notif.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require("expo-constants");
    const projectId =
      Constants?.easConfig?.projectId ??
      Constants?.default?.easConfig?.projectId ??
      undefined;
    const tokenResp = await notif.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const record: PushTokenRecord = {
      token: tokenResp.data,
      deviceName: getDeviceName(),
      platform: getDevicePlatform(),
      registeredAt: new Date().toISOString(),
    };
    const list = await getStoredPushTokens();
    // 替换同设备 token
    const next = [
      record,
      ...list.filter(
        (t) =>
          !(t.deviceName === record.deviceName && t.platform === record.platform)
      ),
    ];
    await writeJson(TOKEN_KEY, next);
    return record;
  } catch {
    return saveMockToken();
  }
}

async function saveMockToken(): Promise<PushTokenRecord> {
  const record: PushTokenRecord = {
    token: `ExponentPushToken[mock_${randomId("tk")}]`,
    deviceName: getDeviceName(),
    platform: getDevicePlatform(),
    registeredAt: new Date().toISOString(),
  };
  const list = await getStoredPushTokens();
  const next = [
    record,
    ...list.filter(
      (t) =>
        !(t.deviceName === record.deviceName && t.platform === record.platform)
    ),
  ];
  await writeJson(TOKEN_KEY, next);
  return record;
}

export async function unregisterPush(): Promise<void> {
  const list = await getStoredPushTokens();
  const me = getDeviceName();
  const next = list.filter(
    (t) => !(t.deviceName === me && t.platform === getDevicePlatform())
  );
  await writeJson(TOKEN_KEY, next);
}

// ---------- 偏好 ----------

export async function getPref(): Promise<NotificationPref> {
  return readJson<NotificationPref>(PREF_KEY, DEFAULT_PREF);
}

export async function setPref(patch: Partial<NotificationPref>): Promise<NotificationPref> {
  const cur = await getPref();
  const next = { ...cur, ...patch };
  await writeJson(PREF_KEY, next);
  return next;
}

// ---------- 本地提醒 ----------

export async function listReminders(): Promise<ReminderItem[]> {
  return readJson<ReminderItem[]>(REMINDER_KEY, []);
}

export async function markReminderRead(id: string): Promise<void> {
  const list = await listReminders();
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], read: true };
  await writeJson(REMINDER_KEY, list);
}

export async function scheduleLocalReminder(opts: {
  title: string;
  body: string;
  triggerAt: string; // ISO
}): Promise<ReminderItem> {
  const item: ReminderItem = {
    id: randomId("rmd"),
    title: opts.title,
    body: opts.body,
    triggerAt: opts.triggerAt,
    read: false,
  };
  const list = await listReminders();
  list.unshift(item);
  await writeJson(REMINDER_KEY, list.slice(0, 50));

  const p = probeNative();
  if (p.notifications) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const notif = require("expo-notifications");
      const trigger = new Date(opts.triggerAt);
      await notif.scheduleNotificationAsync({
        content: { title: opts.title, body: opts.body },
        trigger,
      });
    } catch {
      // ignore
    }
  }
  return item;
}

// ---------- Seed（演示项目自动注入 2 条） ----------

export async function ensureSeedReminders(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const list = await listReminders();
  if (list.length > 0) return;
  const now = Date.now();
  await writeJson(REMINDER_KEY, [
    {
      id: randomId("rmd"),
      title: "今日校准问答",
      body: "用 3 分钟回答 3 道题，让画像更准。",
      triggerAt: new Date(now + 3600_000).toISOString(),
      read: false,
    },
    {
      id: randomId("rmd"),
      title: "本周人物解读已生成",
      body: "你的历史人物匹配已更新，去看看 →",
      triggerAt: new Date(now - 86400_000).toISOString(),
      read: false,
    },
  ]);
}
