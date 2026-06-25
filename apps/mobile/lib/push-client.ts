/**
 * Push 后端客户端 — 替换本地 AsyncStorage mock
 *
 * 切换方式:
 *   1) 设置环境变量 EXPO_PUBLIC_API_BASE_URL
 *   2) 默认走 mock（与之前一致）
 *   3) 真实后端就绪后通过 getPushClient().enable() 切到 http
 *
 * 设计:
 *   - 单例 client，调用方不感知 mock/http 切换
 *   - 失败回退到 mock（断网 / 后端 500 时不阻塞 UI）
 */

import type {
  NotificationPref,
  PushTokenRecord,
  ReminderItem,
} from "@ntgm/sdk";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getStoredPushTokens, registerForPush as registerMock } from "./notifications";
import { getDeviceName, getDevicePlatform } from "./permissions";

const PREF_KEY = "ntgm.mobile.notifPrefs";
const REMINDER_KEY = "ntgm.mobile.reminders";
const TOKEN_KEY = "ntgm.mobile.pushTokens";

const DEFAULT_PREF: NotificationPref = {
  pushEnabled: false,
  dailyReminder: true,
  weeklyDigest: false,
  marketingNews: false,
};

type Mode = "mock" | "http";

class PushClient {
  private mode: Mode = "mock";
  private baseUrl: string | null = null;
  private authToken: string | null = null;

  enable(baseUrl: string, authToken: string | null) {
    this.mode = "http";
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.authToken = authToken;
  }

  disable() {
    this.mode = "mock";
    this.baseUrl = null;
    this.authToken = null;
  }

  getMode(): Mode {
    return this.mode;
  }

  // ---- token ----

  async registerToken(): Promise<PushTokenRecord | null> {
    if (this.mode === "mock") {
      return registerMock();
    }
    try {
      // 先本地拿 token（这个没法 mock，expo-notifications 必跑）
      const local = await registerMock();
      if (!local) return null;
      const res = await fetch(`${this.baseUrl}/push/tokens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
        },
        body: JSON.stringify({
          token: local.token,
          platform: local.platform,
          deviceName: local.deviceName,
        }),
      });
      if (!res.ok) {
        // 失败回退 mock
        return local;
      }
      const data = await res.json();
      return {
        ...local,
        token: data.token || local.token,
        // 同步 server 状态
        registeredAt: data.registeredAt || local.registeredAt,
      };
    } catch {
      // 断网回退 mock
      return registerMock();
    }
  }

  async listMyTokens(): Promise<PushTokenRecord[]> {
    if (this.mode === "mock") {
      return getStoredPushTokens();
    }
    try {
      const res = await fetch(`${this.baseUrl}/push/tokens`, {
        headers: this.authToken
          ? { Authorization: `Bearer ${this.authToken}` }
          : {},
      });
      if (!res.ok) return getStoredPushTokens();
      const data = (await res.json()) as { tokens: PushTokenRecord[] };
      // 同步本地
      await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(data.tokens));
      return data.tokens;
    } catch {
      return getStoredPushTokens();
    }
  }

  async unregisterToken(): Promise<void> {
    if (this.mode === "mock") {
      const list = await getStoredPushTokens();
      const next = list.filter(
        (t) =>
          !(
            t.deviceName === getDeviceName() &&
            t.platform === getDevicePlatform()
          )
      );
      await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(next));
      return;
    }
    try {
      const tokens = await this.listMyTokens();
      const me = tokens.find(
        (t) =>
          t.deviceName === getDeviceName() &&
          t.platform === getDevicePlatform()
      );
      if (!me) return;
      await fetch(`${this.baseUrl}/push/tokens/${me.token}`, {
        method: "DELETE",
        headers: this.authToken
          ? { Authorization: `Bearer ${this.authToken}` }
          : {},
      });
    } catch {
      // ignore
    }
  }

  // ---- reminder ----

  async listReminders(): Promise<ReminderItem[]> {
    if (this.mode === "mock") {
      return readJson<ReminderItem[]>(REMINDER_KEY, []);
    }
    try {
      const res = await fetch(`${this.baseUrl}/reminders`, {
        headers: this.authToken
          ? { Authorization: `Bearer ${this.authToken}` }
          : {},
      });
      if (!res.ok) return readJson<ReminderItem[]>(REMINDER_KEY, []);
      const data = (await res.json()) as { reminders: any[] };
      const mapped: ReminderItem[] = data.reminders.map((r) => ({
        id: r.reminderId,
        title: r.title,
        body: r.body,
        triggerAt: r.triggerAt,
        read: r.read,
      }));
      await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(mapped));
      return mapped;
    } catch {
      return readJson<ReminderItem[]>(REMINDER_KEY, []);
    }
  }

  async scheduleReminder(opts: {
    title: string;
    body: string;
    triggerAt: string;
  }): Promise<ReminderItem> {
    if (this.mode === "mock") {
      return mockSchedule(opts);
    }
    const res = await fetch(`${this.baseUrl}/reminders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
      },
      body: JSON.stringify({
        title: opts.title,
        body: opts.body,
        triggerAt: opts.triggerAt,
        channel: "push",
      }),
    });
    if (!res.ok) return mockSchedule(opts);
    const r = await res.json();
    // 立即派发（演示项目：把"几分钟后"用真实扫描的 cron 替代，
    // 这里 demo 直接打 dispatch-immediate 来模拟后端立即推）
    try {
      await fetch(`${this.baseUrl}/reminders/dispatch-immediate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.authToken
            ? { Authorization: `Bearer ${this.authToken}` }
            : {}),
        },
        body: JSON.stringify({
          title: opts.title,
          body: opts.body,
          channel: "push",
          data: { reminderId: r.reminderId },
        }),
      });
    } catch {
      // ignore
    }
    const list = await this.listReminders();
    return list[0] ?? mockSchedule(opts);
  }

  async markReminderRead(id: string): Promise<void> {
    if (this.mode === "mock") {
      const list = await readJson<ReminderItem[]>(REMINDER_KEY, []);
      const idx = list.findIndex((r) => r.id === id);
      if (idx >= 0) {
        list[idx].read = true;
        await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(list));
      }
      return;
    }
    try {
      await fetch(`${this.baseUrl}/reminders/${id}/read`, {
        method: "POST",
        headers: this.authToken
          ? { Authorization: `Bearer ${this.authToken}` }
          : {},
      });
    } catch {
      // ignore
    }
  }

  // ---- preference ----

  async getPref(): Promise<NotificationPref> {
    return readJson<NotificationPref>(PREF_KEY, DEFAULT_PREF);
  }

  async setPref(patch: Partial<NotificationPref>): Promise<NotificationPref> {
    const cur = await this.getPref();
    const next = { ...cur, ...patch };
    await AsyncStorage.setItem(PREF_KEY, JSON.stringify(next));
    return next;
  }
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now()
    .toString(36)
    .slice(-4)}`;
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

async function mockSchedule(opts: {
  title: string;
  body: string;
  triggerAt: string;
}): Promise<ReminderItem> {
  const item: ReminderItem = {
    id: randomId("rmd"),
    title: opts.title,
    body: opts.body,
    triggerAt: opts.triggerAt,
    read: false,
  };
  const list = await readJson<ReminderItem[]>(REMINDER_KEY, []);
  list.unshift(item);
  await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(list.slice(0, 50)));
  return item;
}

export const pushClient = new PushClient();
