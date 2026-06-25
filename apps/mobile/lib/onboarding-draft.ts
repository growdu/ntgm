/**
 * Onboarding 草稿持久化
 *
 * - 每次表单变更 debounce 1s 写入 AsyncStorage
 * - 启动时若有草稿，提示恢复
 * - 提交成功后清除
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OnboardingDraft, OnboardingStep } from "@ntgm/sdk";

const DRAFT_KEY = "ntgm.mobile.onboardingDraft";
const STEP_KEY = "ntgm.mobile.onboardingStep";

const EMPTY_DRAFT: OnboardingDraft = {
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUncertain: false,
  birthPlace: "",
  faceAssetIds: [],
  palmAssetIds: [],
};

const STEP_ORDER: OnboardingStep[] = [
  "welcome",
  "basic",
  "photo",
  "review",
  "submitting",
  "done",
];

export function getStepIndex(step: OnboardingStep): number {
  return STEP_ORDER.indexOf(step);
}

export function getTotalSteps(): number {
  return STEP_ORDER.length;
}

export async function loadDraft(): Promise<{
  draft: OnboardingDraft;
  step: OnboardingStep;
} | null> {
  try {
    const [rawDraft, rawStep] = await Promise.all([
      AsyncStorage.getItem(DRAFT_KEY),
      AsyncStorage.getItem(STEP_KEY),
    ]);
    if (!rawDraft) return null;
    const draft = JSON.parse(rawDraft) as OnboardingDraft;
    const step = (rawStep as OnboardingStep) ?? "welcome";
    return { draft, step };
  } catch {
    return null;
  }
}

export async function saveDraft(
  draft: OnboardingDraft,
  step: OnboardingStep
): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)),
      AsyncStorage.setItem(STEP_KEY, step),
    ]);
  } catch {
    // ignore
  }
}

export async function clearDraft(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(DRAFT_KEY),
      AsyncStorage.removeItem(STEP_KEY),
    ]);
  } catch {
    // ignore
  }
}

export function isEmptyDraft(d: OnboardingDraft): boolean {
  return (
    d === EMPTY_DRAFT ||
    (!d.name &&
      !d.gender &&
      !d.birthDate &&
      !d.birthTime &&
      !d.birthPlace &&
      d.faceAssetIds.length === 0 &&
      d.palmAssetIds.length === 0)
  );
}

// 校验某个 step 是否能进入下一步
export function canAdvance(
  step: OnboardingStep,
  draft: OnboardingDraft
): { ok: boolean; reason?: string } {
  switch (step) {
    case "welcome":
      return { ok: true };
    case "basic":
      if (!draft.name.trim()) return { ok: false, reason: "请填写昵称" };
      if (!draft.gender) return { ok: false, reason: "请选择性别" };
      if (!draft.birthDate) return { ok: false, reason: "请填写出生日期" };
      if (!draft.birthTimeUncertain && !draft.birthTime) {
        return { ok: false, reason: "请填写出生时间，或勾选『时间不详』" };
      }
      if (!draft.birthPlace.trim()) {
        return { ok: false, reason: "请填写出生地点" };
      }
      return { ok: true };
    case "photo":
      // 照片可选
      return { ok: true };
    case "review":
      return { ok: true };
    default:
      return { ok: true };
  }
}

// 把 draft 转成 BasicIntakeRequest
export function toIntakeRequest(
  draft: OnboardingDraft
): { name: string; gender: string; birthDatetime: string; birthPlace: string } {
  const date = draft.birthDate; // YYYY-MM-DD
  const time = draft.birthTimeUncertain ? "12:00" : draft.birthTime; // 默认中午
  // ISO: 2024-05-15T10:30:00 (无时区)
  const birthDatetime = `${date}T${time.length === 5 ? time + ":00" : time}`;
  return {
    name: draft.name.trim(),
    gender: draft.gender || "prefer_not_to_say",
    birthDatetime,
    birthPlace: draft.birthPlace.trim(),
  };
}
