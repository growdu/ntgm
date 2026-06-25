export type HealthResponse = {
  success: boolean;
  data: {
    status: string;
  };
};

export type BasicIntakeRequest = {
  name: string;
  gender: string;
  birthDatetime: string;
  birthPlace: string;
};

export type BasicIntakeResponse = {
  userId: string;
  accepted: boolean;
  nextAction: string;
  profileVersion: number;
};

export type UserMeResponse = {
  userId: string;
  name: string | null;
  gender: string | null;
  birthDatetime: string | null;
  birthPlace: string | null;
  currentProfileVersion: number;
};

export type IntakeRecordItem = {
  recordId: string;
  intakeType: string;
  sourceChannel: string;
  payload: Record<string, unknown>;
  confidence: number | null;
  submittedAt: string;
};

export type BaziCurrentResponse = {
  analysisId: string;
  chart: {
    yearGz: string;
    monthGz: string;
    dayGz: string;
    hourGz: string;
  };
  featureData: Record<string, unknown>;
  interpretationData: Record<string, unknown>;
  score: number;
  confidence: number;
  engineVersion: string;
};

export type ProfileSummaryResponse = {
  profileId: string;
  userId: string;
  profileVersion: number;
  summary: Record<string, unknown>;
  personalityTraits: Record<string, unknown>;
  abilityTraits: Record<string, unknown>;
  relationshipTraits: Record<string, unknown>;
  fortuneTraits: Record<string, unknown>;
  confidenceMap: Record<string, unknown>;
  engineVersion: string;
};

export type MatchItem = {
  rank: number;
  figureName: string;
  similarityScore: number;
  highlights: string[];
  differences: string[];
};

export type MatchCurrentResponse = {
  profileVersion: number;
  topMatches: MatchItem[];
  explanation: Record<string, unknown>;
};

export type ProfileVersionItem = {
  profileId: string;
  profileVersion: number;
  summary: Record<string, unknown>;
  confidenceMap: Record<string, unknown>;
  engineVersion: string;
  createdAt: string;
};

export type ProfileVersionListResponse = {
  items: ProfileVersionItem[];
};

export type AdviceCurrentResponse = {
  adviceId: string;
  profileVersion: number;
  summary: Record<string, unknown>;
};

export type JobCreateResponse = {
  jobId: string;
  jobType: string;
  status: string;
};

export type QuestionnaireQuestion = {
  questionId: string;
  questionText: string;
  traitTargets: string[];
  options: string[];
};

export type QuestionnaireNextResponse = {
  questions: QuestionnaireQuestion[];
};

export type QuestionnaireAnswerItem = {
  questionId: string;
  value: string;
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

export type QuestionnaireAnswerResponse = {
  accepted: boolean;
  recomputeTriggered: boolean;
  jobId: string;
  profileVersion: number;
};

export type QuestionnaireProgressResponse = {
  totalGroups: number;
  totalQuestions: number;
  groups: Array<{
    group: string;
    label: string;
    count: number;
  }>;
};

export type LifeEventCreateRequest = {
  eventType: string;
  eventTime: string;
  title: string;
  description?: string | null;
  payload?: Record<string, unknown>;
  impactScore?: number | null;
};

export type LifeEventResponse = {
  eventId: string;
  recomputeTriggered: boolean;
  jobId: string;
  profileVersion: number;
};

export type LifeEventItem = {
  eventId: string;
  eventType: string;
  eventTime: string;
  title: string;
  description: string | null;
  impactScore: number | null;
};

export type ProfileChangeLogItem = {
  changeId: string;
  fromVersion: number;
  toVersion: number;
  changedDimensions: {
    raised?: string[];
    lowered?: string[];
    topDiffs?: Array<{
      dimension: string;
      previousValue: number;
      currentValue: number;
      delta: number;
      direction: string;
    }>;
    uncertainDimensions?: string[];
  };
  reasonSummary: {
    headline?: string;
    trigger?: string;
    newEvidence?: string[];
    evidenceDelta?: Record<string, number>;
    sourceSnapshot?: Record<string, unknown>;
  };
  createdAt: string;
};

export type ArchiveChangesResponse = {
  items: ProfileChangeLogItem[];
};

export type ArchiveTimelineItem = {
  itemType: string;
  occurredAt: string;
  title: string;
  summary: string;
  profileVersion: number | null;
  metadata: Record<string, unknown>;
};

export type ArchiveTimelineResponse = {
  items: ArchiveTimelineItem[];
};

export type ArchiveTimelineQuery = {
  limit?: number;
  types?: string[];
  profileVersion?: number | null;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

async function request<T>(apiBaseUrl: string, path: string, options?: RequestOptions): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {})
    },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(response.status, detail || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchHealth(apiBaseUrl: string): Promise<HealthResponse> {
  return request<HealthResponse>(apiBaseUrl, "/health");
}

export async function submitBasicIntake(
  apiBaseUrl: string,
  payload: BasicIntakeRequest
): Promise<BasicIntakeResponse> {
  return request<BasicIntakeResponse>(apiBaseUrl, "/users/intake/basic", {
    method: "POST",
    body: payload
  });
}

export async function fetchCurrentUser(apiBaseUrl: string): Promise<UserMeResponse> {
  return request<UserMeResponse>(apiBaseUrl, "/users/me");
}

export async function fetchIntakeRecords(
  apiBaseUrl: string,
  query?: { intakeType?: string; limit?: number }
): Promise<IntakeRecordItem[]> {
  const params = new URLSearchParams();
  if (query?.intakeType) params.set("intakeType", query.intakeType);
  if (query?.limit !== undefined) params.set("limit", String(query.limit));
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return request<IntakeRecordItem[]>(apiBaseUrl, `/intake/records${suffix}`);
}

export async function fetchCurrentBazi(apiBaseUrl: string): Promise<BaziCurrentResponse> {
  return request<BaziCurrentResponse>(apiBaseUrl, "/bazi/current");
}

export async function fetchCurrentProfile(apiBaseUrl: string): Promise<ProfileSummaryResponse> {
  return request<ProfileSummaryResponse>(apiBaseUrl, "/profiles/current");
}

export async function fetchProfileVersions(apiBaseUrl: string): Promise<ProfileVersionListResponse> {
  return request<ProfileVersionListResponse>(apiBaseUrl, "/profiles/versions");
}

export async function fetchProfileVersion(
  apiBaseUrl: string,
  versionNo: number
): Promise<ProfileSummaryResponse> {
  return request<ProfileSummaryResponse>(apiBaseUrl, `/profiles/versions/${versionNo}`);
}

export async function fetchCurrentMatch(apiBaseUrl: string): Promise<MatchCurrentResponse> {
  return request<MatchCurrentResponse>(apiBaseUrl, "/matches/current");
}

export async function fetchCurrentAdvice(apiBaseUrl: string): Promise<AdviceCurrentResponse> {
  return request<AdviceCurrentResponse>(apiBaseUrl, "/advice/current");
}

export async function regenerateAdvice(apiBaseUrl: string): Promise<AdviceCurrentResponse> {
  return request<AdviceCurrentResponse>(apiBaseUrl, "/advice/regenerate", { method: "POST" });
}

export async function submitAdviceFeedback(
  apiBaseUrl: string,
  payload: { feedbackType: string; feedbackText?: string; adviceItemId?: string }
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(apiBaseUrl, "/advice/feedback", {
    method: "POST",
    body: payload,
  });
}

export async function recomputeProfile(
  apiBaseUrl: string,
  reason = "manual_refresh"
): Promise<JobCreateResponse> {
  return request<JobCreateResponse>(apiBaseUrl, "/profiles/recompute", {
    method: "POST",
    body: { reason }
  });
}

export async function fetchNextQuestions(apiBaseUrl: string): Promise<QuestionnaireNextResponse> {
  return request<QuestionnaireNextResponse>(apiBaseUrl, "/questionnaire/next");
}

export async function fetchQuestionnaireProgress(apiBaseUrl: string): Promise<QuestionnaireProgressResponse> {
  return request<QuestionnaireProgressResponse>(apiBaseUrl, "/questionnaire/progress");
}

export async function resetQuestionnaireProgress(apiBaseUrl: string): Promise<void> {
  return request<void>(apiBaseUrl, "/questionnaire/reset", { method: "POST" });
}

export async function submitQuestionnaireAnswers(
  apiBaseUrl: string,
  answers: QuestionnaireAnswerItem[]
): Promise<QuestionnaireAnswerResponse> {
  return request<QuestionnaireAnswerResponse>(apiBaseUrl, "/questionnaire/answers", {
    method: "POST",
    body: { answers }
  });
}

export async function createLifeEvent(
  apiBaseUrl: string,
  payload: LifeEventCreateRequest
): Promise<LifeEventResponse> {
  return request<LifeEventResponse>(apiBaseUrl, "/events", {
    method: "POST",
    body: payload
  });
}

export async function fetchLifeEvents(apiBaseUrl: string): Promise<LifeEventItem[]> {
  return request<LifeEventItem[]>(apiBaseUrl, "/events");
}

export async function fetchArchiveChanges(apiBaseUrl: string): Promise<ArchiveChangesResponse> {
  return request<ArchiveChangesResponse>(apiBaseUrl, "/archive/changes");
}

export async function fetchArchiveTimeline(
  apiBaseUrl: string,
  query?: ArchiveTimelineQuery
): Promise<ArchiveTimelineResponse> {
  const params = new URLSearchParams();

  if (query?.limit !== undefined) {
    params.set("limit", String(query.limit));
  }
  if (query?.types && query.types.length > 0) {
    params.set("types", query.types.join(","));
  }
  if (query?.profileVersion !== undefined && query.profileVersion !== null) {
    params.set("profileVersion", String(query.profileVersion));
  }

  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return request<ArchiveTimelineResponse>(apiBaseUrl, `/archive/timeline${suffix}`);
}

// ============================================
// Auth & Account types
// ============================================

export type Plan = "free" | "pro" | "master";

export type AccountUser = {
  userId: string;
  email: string;
  displayName: string;
  plan: Plan;
  createdAt: string;
};

export type SignupRequest = {
  email: string;
  password: string;
  displayName: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type AuthResponse = {
  user: AccountUser;
  token: string;
};

export type AuthError = {
  code: string;
  message: string;
};

// ============================================
// Pricing & Payment types
// ============================================

export type PricingPlan = {
  id: Plan;
  name: string;
  description: string;
  priceCents: number;
  currency: "CNY";
  features: string[];
  excludedFeatures?: string[];
  highlight?: boolean;
  badge?: string;
};

export type CheckoutRequest = {
  planId: Plan;
  paymentMethod: "wechat" | "alipay" | "card";
};

export type CheckoutResponse = {
  checkoutId: string;
  redirectUrl: string;
  expiresAt: string;
};

export type OrderRecord = {
  orderId: string;
  planId: Plan;
  amountCents: number;
  status: "pending" | "paid" | "failed" | "refunded";
  createdAt: string;
  paidAt: string | null;
};

// ============================================
// Creation (创作) types
// ============================================

export type Work = {
  workId: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  tags: string[];
  visibility: "public" | "private";
  likes: number;
  views: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateWorkRequest = {
  title: string;
  body: string;
  tags?: string[];
  visibility?: "public" | "private";
};

export type CreateWorkResponse = {
  work: Work;
};

export type ListWorksResponse = {
  works: Work[];
  total: number;
};

// ============================================
// 拍照上传 (mobile)
// ============================================

export type AssetType = "face" | "palm";

export type UploadedAsset = {
  assetId: string;
  userId: string;
  assetType: AssetType;
  localUri: string; // file://... 或 data:image/...
  mimeType: string;
  size: number;
  uploadedAt: string;
};

export type UploadAssetRequest = {
  assetType: AssetType;
  localUri: string;
  mimeType: string;
  size: number;
};

export type UploadAssetResponse = {
  asset: UploadedAsset;
  remoteUrl: string | null; // null = mock，未真正上传
};

// ============================================
// 推送通知 (mobile)
// ============================================

export type PushPermissionStatus = "granted" | "denied" | "undetermined";

export type PushTokenRecord = {
  token: string;
  deviceName: string;
  platform: "ios" | "android" | "unknown";
  registeredAt: string;
};

export type NotificationPref = {
  pushEnabled: boolean;
  dailyReminder: boolean;
  weeklyDigest: boolean;
  marketingNews: boolean;
};

export type ReminderItem = {
  id: string;
  title: string;
  body: string;
  triggerAt: string; // ISO
  read: boolean;
};

// ============================================
// Onboarding（mobile 独立建档）
// ============================================

export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

// 注意：BasicIntakeRequest / BasicIntakeResponse 已在文件顶部定义，
// 这里只补 mobile 端 onboarding 用的辅助类型。

export type OnboardingStep =
  | "welcome"
  | "basic"
  | "photo"
  | "review"
  | "submitting"
  | "done";

export type OnboardingDraft = {
  name: string;
  gender: Gender | "";
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:MM
  birthTimeUncertain: boolean;
  birthPlace: string;
  faceAssetIds: string[]; // local refs
  palmAssetIds: string[];
};

export type OnboardingProgress = {
  step: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
};

export type OnboardingStatus = {
  completed: boolean;
  hasName: boolean;
  hasBirth: boolean;
  currentProfileVersion: number;
};
