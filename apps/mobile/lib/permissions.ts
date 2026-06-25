/**
 * 权限处理 — camera / mediaLibrary / notifications
 *
 * 设计:
 * - 探测原生模块是否可用（dev web 预览/Node 测试环境会失败）
 * - 失败时降级到 mock，UI 层无感
 * - 真实运行（iOS/Android 设备或模拟器）走原生 API
 */

import { Platform } from "react-native";
import type { PushPermissionStatus } from "@ntgm/sdk";

export type NativeProbe = {
  imagePicker: boolean;
  notifications: boolean;
  isRealDevice: boolean;
};

let probeCache: NativeProbe | null = null;

export function probeNative(): NativeProbe {
  if (probeCache) return probeCache;
  const probe: NativeProbe = {
    imagePicker: false,
    notifications: false,
    isRealDevice: false,
  };
  try {
    // dynamic require：避免在不可用环境直接崩
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const picker = require("expo-image-picker");
    probe.imagePicker = !!picker?.launchCameraAsync;
  } catch {
    probe.imagePicker = false;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const notif = require("expo-notifications");
    probe.notifications = !!notif?.getPermissionsAsync;
  } catch {
    probe.notifications = false;
  }
  probeCache = probe;
  return probe;
}

// ---------- Camera ----------

export type CameraPermResult = {
  status: PushPermissionStatus;
  canAskAgain: boolean;
  mock: boolean;
};

export async function requestCameraPermission(): Promise<CameraPermResult> {
  const p = probeNative();
  if (!p.imagePicker) {
    // mock：直接 granted，标记为 mock
    return { status: "granted", canAskAgain: true, mock: true };
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const picker = require("expo-image-picker");
  const { status, canAskAgain } = await picker.requestCameraPermissionsAsync();
  return {
    status: status as PushPermissionStatus,
    canAskAgain: !!canAskAgain,
    mock: false,
  };
}

// ---------- Media Library ----------

export async function requestMediaLibraryPermission(): Promise<CameraPermResult> {
  const p = probeNative();
  if (!p.imagePicker) {
    return { status: "granted", canAskAgain: true, mock: true };
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const picker = require("expo-image-picker");
  const { status, canAskAgain } =
    await picker.requestMediaLibraryPermissionsAsync();
  return {
    status: status as PushPermissionStatus,
    canAskAgain: !!canAskAgain,
    mock: false,
  };
}

// ---------- Notifications ----------

export async function getNotificationPermission(): Promise<CameraPermResult> {
  const p = probeNative();
  if (!p.notifications) {
    return { status: "undetermined", canAskAgain: true, mock: true };
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const notif = require("expo-notifications");
  const { status, canAskAgain } = await notif.getPermissionsAsync();
  return {
    status: status as PushPermissionStatus,
    canAskAgain: !!canAskAgain,
    mock: false,
  };
}

export async function requestNotificationPermission(): Promise<CameraPermResult> {
  const p = probeNative();
  if (!p.notifications) {
    return { status: "granted", canAskAgain: true, mock: true };
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const notif = require("expo-notifications");
  const { status, canAskAgain } = await notif.requestPermissionsAsync();
  return {
    status: status as PushPermissionStatus,
    canAskAgain: !!canAskAgain,
    mock: false,
  };
}

// ---------- Device info ----------

export function getDevicePlatform(): "ios" | "android" | "unknown" {
  if (Platform.OS === "ios" || Platform.OS === "android") return Platform.OS;
  return "unknown";
}

export function getDeviceName(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require("expo-constants");
    const name =
      Constants?.default?.deviceName ||
      Constants?.deviceName ||
      `${Platform.OS}-device`;
    return name;
  } catch {
    return `${Platform.OS}-device`;
  }
}
