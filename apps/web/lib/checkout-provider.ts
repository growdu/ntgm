/**
 * Checkout Provider — 抽象支付后端
 *
 * 默认: MockCheckoutProvider（立即把 plan 升级，无真实支付）
 * 真接 Stripe 时: 替换为 StripeCheckoutProvider
 *
 * 切换方式: 设置环境变量 NTGM_CHECKOUT=stripe
 */

import {
  createCheckout as mockCreateCheckout,
  type MockApiError,
} from "./mockApi";
import type { Plan } from "@ntgm/sdk";

export type CheckoutRequest = {
  planId: Plan;
  paymentMethod: "wechat" | "alipay" | "card";
};

export type CheckoutResult = {
  checkoutId: string;
  redirectUrl: string;
  expiresAt: string;
};

export interface CheckoutProvider {
  readonly name: "mock" | "stripe";
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
}

// ---------- Mock Provider ----------
class MockCheckoutProvider implements CheckoutProvider {
  readonly name = "mock" as const;
  async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    const res = await mockCreateCheckout(req.planId, req.paymentMethod);
    return res;
  }
}

// ---------- Stripe Provider (test mode) ----------
/**
 * 真接 Stripe 时的实现。
 *
 * 流程:
 * 1) 前端调后端 /api/checkout/create — 后端调用 Stripe.checkout.sessions.create
 * 2) 后端返回 session.url
 * 3) 前端用 stripe.redirectToCheckout({ sessionId }) 跳到 Stripe
 * 4) 支付成功 Stripe webhook 回调后端，后端升级用户 plan
 * 5) 前端从 /create?paid=xxx 落地
 *
 * 演示项目不实现后端，所以这里 stub 返回一个 mock 的 redirectUrl。
 * 真接 Stripe 时，把下面的 STUB 标记位置替换为真实 fetch + stripe-js 调用。
 */
class StripeCheckoutProvider implements CheckoutProvider {
  readonly name = "stripe" as const;
  async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    // STUB: 真接 Stripe 时改成：
    //   const res = await fetch("/api/checkout/create", { method: "POST", body: JSON.stringify(req) });
    //   const { sessionId, url } = await res.json();
    //   const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
    //   await stripe!.redirectToCheckout({ sessionId });
    //   return { checkoutId: sessionId, redirectUrl: url, expiresAt: new Date(Date.now() + 30*60*1000).toISOString() };

    // 演示版：直接走 mock 升级但标识为 stripe
    const mock = await mockCreateCheckout(req.planId, req.paymentMethod);
    return {
      ...mock,
      redirectUrl: `/create?paid=${req.planId}&via=stripe`,
    };
  }
}

// ---------- 选择 Provider ----------
let cached: CheckoutProvider | null = null;

export function getCheckoutProvider(): CheckoutProvider {
  if (cached) return cached;
  const mode = process.env.NEXT_PUBLIC_NTGM_CHECKOUT ?? "mock";
  if (mode === "stripe") {
    cached = new StripeCheckoutProvider();
  } else {
    cached = new MockCheckoutProvider();
  }
  return cached;
}

export type { MockApiError };
