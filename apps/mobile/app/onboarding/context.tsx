"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { OnboardingDraft, OnboardingStep } from "@ntgm/sdk";
import {
  canAdvance as canAdvanceFn,
  clearDraft as clearDraftStore,
  getStepIndex,
  getTotalSteps,
  isEmptyDraft,
  loadDraft,
  saveDraft,
  toIntakeRequest,
} from "../../lib/onboarding-draft";

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

type ContextValue = {
  draft: OnboardingDraft;
  step: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
  loaded: boolean;
  hasSavedDraft: boolean;
  updateDraft: (patch: Partial<OnboardingDraft>) => void;
  goTo: (step: OnboardingStep) => void;
  next: () => { ok: boolean; reason?: string };
  back: () => void;
  reset: () => Promise<void>;
  toIntake: () => ReturnType<typeof toIntakeRequest>;
};

const OnboardingContext = createContext<ContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_DRAFT);
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [loaded, setLoaded] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 启动时读草稿
  useEffect(() => {
    (async () => {
      const saved = await loadDraft();
      if (saved) {
        setDraft(saved.draft);
        setStep(saved.step);
        if (!isEmptyDraft(saved.draft)) setHasSavedDraft(true);
      }
      setLoaded(true);
    })();
  }, []);

  // draft/step 变化时持久化（debounce 800ms）
  useEffect(() => {
    if (!loaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDraft(draft, step);
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [draft, step, loaded]);

  const updateDraft = useCallback((patch: Partial<OnboardingDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const goTo = useCallback((s: OnboardingStep) => {
    setStep(s);
  }, []);

  const next = useCallback((): { ok: boolean; reason?: string } => {
    const order: OnboardingStep[] = [
      "welcome",
      "basic",
      "photo",
      "review",
      "submitting",
      "done",
    ];
    const idx = order.indexOf(step);
    if (idx < 0) return { ok: false, reason: "未知步骤" };
    const check = canAdvanceFn(step, draft);
    if (!check.ok) return check;
    if (idx + 1 >= order.length) return { ok: false, reason: "已是最后一步" };
    setStep(order[idx + 1]);
    return { ok: true };
  }, [draft, step]);

  const back = useCallback(() => {
    const order: OnboardingStep[] = [
      "welcome",
      "basic",
      "photo",
      "review",
      "submitting",
      "done",
    ];
    const idx = order.indexOf(step);
    if (idx > 0) {
      setStep(order[idx - 1]);
    }
  }, [step]);

  const reset = useCallback(async () => {
    setDraft(EMPTY_DRAFT);
    setStep("welcome");
    setHasSavedDraft(false);
    await clearDraftStore();
  }, []);

  const value = useMemo<ContextValue>(
    () => ({
      draft,
      step,
      stepIndex: getStepIndex(step),
      totalSteps: getTotalSteps(),
      loaded,
      hasSavedDraft,
      updateDraft,
      goTo,
      next,
      back,
      reset,
      toIntake: () => toIntakeRequest(draft),
    }),
    [draft, step, loaded, hasSavedDraft, updateDraft, goTo, next, back, reset]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): ContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return ctx;
}
