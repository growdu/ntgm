/**
 * Onboarding 后端 client
 *
 * 走 /users/intake/basic 触发后端建档 + 初始八字 + 画像
 * 失败时回退 mock（不阻塞 UI）
 */

import type {
  BasicIntakeRequest,
  BasicIntakeResponse,
  UploadedAsset,
} from "@ntgm/sdk";
import { getCurrentUser } from "./api";
import { listMyAssets } from "./photos";

type Mode = "mock" | "http";

class OnboardingClient {
  private mode: Mode = "mock";
  private baseUrl: string | null = null;
  private authToken: string | null = null;

  enable(baseUrl: string, token: string | null) {
    this.mode = "http";
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.authToken = token;
  }

  disable() {
    this.mode = "mock";
    this.baseUrl = null;
    this.authToken = null;
  }

  getMode(): Mode {
    return this.mode;
  }

  async submit(payload: BasicIntakeRequest): Promise<BasicIntakeResponse> {
    if (this.mode === "mock") {
      return mockSubmit();
    }
    try {
      const res = await fetch(`${this.baseUrl}/users/intake/basic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.authToken
            ? { Authorization: `Bearer ${this.authToken}` }
            : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
      }
      return (await res.json()) as BasicIntakeResponse;
    } catch (err) {
      // 断网/后端不可用 → 回退 mock
      console.warn("[onboarding] backend submit failed, fallback to mock:", err);
      return mockSubmit();
    }
  }

  async getCurrentAssets(): Promise<UploadedAsset[]> {
    return listMyAssets();
  }

  async pollCurrentUser() {
    return getCurrentUser();
  }
}

async function mockSubmit(): Promise<BasicIntakeResponse> {
  // 模拟 1.2s 网络
  await new Promise((r) => setTimeout(r, 1200));
  return {
    userId: "mock-user-self",
    accepted: true,
    nextAction: "questionnaire",
    profileVersion: 1,
  };
}

export const onboardingClient = new OnboardingClient();
