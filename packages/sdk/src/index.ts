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

export async function fetchIntakeRecords(apiBaseUrl: string): Promise<IntakeRecordItem[]> {
  return request<IntakeRecordItem[]>(apiBaseUrl, "/intake/records");
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
