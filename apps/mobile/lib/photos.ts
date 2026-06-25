/**
 * 拍照/选图/上传 — 抽象层
 *
 * - launchCamera / launchPicker 走 expo-image-picker
 * - 不可用时返回 mock 结果（用 placeholder data URL）
 * - uploadAsset 把图片写入 mock store（AsyncStorage）
 * - 真实后端就绪时把 uploadAsset 替换为 fetch + 签名 URL
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  AssetType,
  UploadAssetRequest,
  UploadAssetResponse,
  UploadedAsset,
} from "@ntgm/sdk";
import { probeNative, requestCameraPermission, requestMediaLibraryPermission } from "./permissions";
import { getCurrentUser } from "./api";

const ASSET_KEY = "ntgm.mobile.assets";

// ---------- 内部工具 ----------

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function readAssets(): Promise<UploadedAsset[]> {
  try {
    const raw = await AsyncStorage.getItem(ASSET_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as UploadedAsset[];
  } catch {
    return [];
  }
}

async function writeAssets(assets: UploadedAsset[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ASSET_KEY, JSON.stringify(assets));
  } catch {
    // ignore
  }
}

// ---------- 拍照 ----------

export type CameraResult = {
  uri: string;
  mimeType: string;
  size: number;
  mock: boolean;
};

export async function takePhoto(): Promise<CameraResult | null> {
  const p = probeNative();
  if (!p.imagePicker) {
    // mock 模式：返回一个 base64 占位图
    return {
      uri: makeMockDataUrl("camera"),
      mimeType: "image/jpeg",
      size: 12_345,
      mock: true,
    };
  }
  const perm = await requestCameraPermission();
  if (perm.status !== "granted") {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const picker = require("expo-image-picker");
  const res = await picker.launchCameraAsync({
    mediaTypes: picker.MediaType?.Images ?? "images",
    quality: 0.85,
    allowsEditing: true,
    aspect: [1, 1],
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return {
    uri: a.uri,
    mimeType: a.mimeType ?? "image/jpeg",
    size: a.fileSize ?? 0,
    mock: false,
  };
}

// ---------- 相册 ----------

export async function pickFromLibrary(): Promise<CameraResult | null> {
  const p = probeNative();
  if (!p.imagePicker) {
    return {
      uri: makeMockDataUrl("library"),
      mimeType: "image/jpeg",
      size: 9_876,
      mock: true,
    };
  }
  const perm = await requestMediaLibraryPermission();
  if (perm.status !== "granted") {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const picker = require("expo-image-picker");
  const res = await picker.launchImageLibraryAsync({
    mediaTypes: picker.MediaType?.Images ?? "images",
    quality: 0.85,
    allowsEditing: true,
    aspect: [1, 1],
    selectionLimit: 1,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return {
    uri: a.uri,
    mimeType: a.mimeType ?? "image/jpeg",
    size: a.fileSize ?? 0,
    mock: false,
  };
}

// ---------- 上传 (mock) ----------

export async function uploadAsset(
  assetType: AssetType,
  file: { uri: string; mimeType: string; size: number }
): Promise<UploadAssetResponse> {
  await sleep(400);
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("请先登录后再上传");
  }
  const req: UploadAssetRequest = {
    assetType,
    localUri: file.uri,
    mimeType: file.mimeType,
    size: file.size,
  };
  const asset: UploadedAsset = {
    assetId: randomId("ast"),
    userId: user.userId,
    assetType: req.assetType,
    localUri: req.localUri,
    mimeType: req.mimeType,
    size: req.size,
    uploadedAt: new Date().toISOString(),
  };
  const list = await readAssets();
  list.unshift(asset);
  await writeAssets(list);
  // mock：没有真实远端 URL
  return { asset, remoteUrl: null };
}

// ---------- 查询 ----------

export async function listAssets(): Promise<UploadedAsset[]> {
  return readAssets();
}

export async function listMyAssets(): Promise<UploadedAsset[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const all = await readAssets();
  return all.filter((a) => a.userId === user.userId);
}

export async function deleteAsset(assetId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("请先登录");
  const all = await readAssets();
  const idx = all.findIndex((a) => a.assetId === assetId);
  if (idx < 0) return;
  if (all[idx].userId !== user.userId) {
    throw new Error("只能删除自己的资源");
  }
  all.splice(idx, 1);
  await writeAssets(all);
}

// ---------- mock 占位图（1x1 像素 PNG，base64 编码） ----------

function makeMockDataUrl(label: string): string {
  // 1x1 红色 PNG
  const png =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  void label;
  return `data:image/png;base64,${png}`;
}
