import { createHmac, timingSafeEqual } from "node:crypto";

export type PlanId = "starter" | "growth" | "pro";

export type PlanConfig = {
  id: PlanId;
  name: string;
  priceMonthlyGbp: number;
  priceMonthlyUsd: number;
  priceAnnualUsd?: number;
  sessionAllowance: number;
  maxProducts: number;
  maxStores: number;
  badge?: string;
  description: string;
  features: string[];
};

export const PLANS: Record<PlanId, PlanConfig> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthlyGbp: 3.99,
    priceMonthlyUsd: 3.99,
    priceAnnualUsd: 3.19,
    sessionAllowance: 1500,
    maxProducts: 500,
    maxStores: 1,
    description: "Ideal for boutique shops and emerging independent brands.",
    features: [
      "1,500 discovery sessions / month",
      "Up to 500 catalogue products",
      "1 storefront workspace",
      "Zero-dependency embed script & iframe",
      "Deterministic catalogue search & filters",
      "30-day shopper interest & click analytics",
      "Standard email support",
    ],
  },
  growth: {
    id: "growth",
    name: "Growth",
    priceMonthlyGbp: 5.99,
    priceMonthlyUsd: 5.99,
    priceAnnualUsd: 4.79,
    sessionAllowance: 6000,
    maxProducts: 2500,
    maxStores: 3,
    badge: "Most Popular",
    description: "For established stores expanding their range and scaling sales.",
    features: [
      "6,000 discovery sessions / month",
      "Up to 2,500 catalogue products",
      "Up to 3 distinct storefronts",
      "Gemini AI soft-intent extraction",
      "Custom brand colors & stylist persona",
      "Top product demand analytics",
      "Priority merchant support",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthlyGbp: 9.99,
    priceMonthlyUsd: 9.99,
    priceAnnualUsd: 7.99,
    sessionAllowance: 25000,
    maxProducts: 10000,
    maxStores: 10,
    description: "For high-volume retail, multi-brand boutiques, and agencies.",
    features: [
      "25,000 discovery sessions / month",
      "Up to 10,000 catalogue products",
      "Up to 10 storefront workspaces",
      "Unlimited catalogue syncs",
      "Attributed order tracking & analytics",
      "Concierge catalogue ingestion & review",
      "Dedicated Slack channel & 99.9% SLA",
    ],
  },
};

export function getLemonSqueezyConfig() {
  return {
    apiKey: process.env.LEMONSQUEEZY_API_KEY || "",
    storeId: process.env.LEMONSQUEEZY_STORE_ID || "",
    webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "",
    variants: {
      starter: process.env.LEMONSQUEEZY_VARIANT_STARTER || "starter_preview",
      growth: process.env.LEMONSQUEEZY_VARIANT_GROWTH || "growth_preview",
      pro: process.env.LEMONSQUEEZY_VARIANT_PRO || "pro_preview",
    },
  };
}

export function getPlanFromVariant(variantId: string | number): PlanId {
  const strId = String(variantId);
  const cfg = getLemonSqueezyConfig();
  if (strId === cfg.variants.growth || strId.toLowerCase().includes("growth")) return "growth";
  if (strId === cfg.variants.pro || strId.toLowerCase().includes("pro")) return "pro";
  return "starter";
}

export function getAllowanceForPlan(plan: string): number {
  if (plan === "pro") return PLANS.pro.sessionAllowance;
  if (plan === "growth") return PLANS.growth.sessionAllowance;
  if (plan === "starter") return PLANS.starter.sessionAllowance;
  return 500; // founding/preview default
}

/**
 * Verifies that the webhook request arrived from Lemon Squeezy using HMAC-SHA256.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  try {
    const hmac = createHmac("sha256", secret).update(rawBody).digest("hex");
    const sigBuffer = Buffer.from(signature, "hex");
    const hmacBuffer = Buffer.from(hmac, "hex");
    if (sigBuffer.length !== hmacBuffer.length) return false;
    return timingSafeEqual(sigBuffer, hmacBuffer);
  } catch {
    return false;
  }
}

/**
 * Creates a checkout session via the Lemon Squeezy REST API (JSON:API specification).
 */
export async function createCheckout(params: {
  tenantId: string;
  userId: string;
  userEmail: string;
  userName: string;
  planId: PlanId;
  storeName: string;
  redirectUrl?: string;
}): Promise<{ checkoutUrl: string }> {
  const { apiKey, storeId, variants } = getLemonSqueezyConfig();
  const variantId = variants[params.planId];

  // If Lemon Squeezy API is not configured or in sandbox mode without API key,
  // provide a simulated checkout for dev/preview testing.
  if (!apiKey || !storeId || variantId.includes("preview")) {
    const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN || "http://localhost:3000";
    // Return a preview redirect that confirms simulation
    return {
      checkoutUrl: `${appOrigin}/merchant?billing=simulated&plan=${params.planId}&tenant=${params.tenantId}`,
    };
  }

  const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN || "https://www.arieya.site";
  const redirectUrl = params.redirectUrl || `${appOrigin}/merchant?billing=success`;

  const payload = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          email: params.userEmail,
          name: params.userName,
          custom: {
            tenant_id: params.tenantId,
            user_id: params.userId,
            plan: params.planId,
          },
        },
        product_options: {
          name: `Arieya ${PLANS[params.planId].name} Plan · ${params.storeName}`,
          redirect_url: redirectUrl,
          receipt_button_text: "Return to Merchant Studio",
          receipt_link_url: `${appOrigin}/merchant`,
        },
      },
      relationships: {
        store: {
          data: {
            type: "stores",
            id: String(storeId),
          },
        },
        variant: {
          data: {
            type: "variants",
            id: String(variantId),
          },
        },
      },
    },
  };

  const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorDetails = data?.errors?.[0]?.detail || "Lemon Squeezy checkout failed.";
    throw new Error(errorDetails);
  }

  const checkoutUrl = data?.data?.attributes?.url;
  if (!checkoutUrl) throw new Error("No checkout URL returned by Lemon Squeezy.");

  return { checkoutUrl };
}

/**
 * Fetches the customer portal URL from Lemon Squeezy for an active customer.
 */
export async function getCustomerPortalUrl(customerId: string): Promise<string | null> {
  const { apiKey } = getLemonSqueezyConfig();
  if (!apiKey || !customerId) return null;

  try {
    const response = await fetch(`https://api.lemonsqueezy.com/v1/customers/${customerId}`, {
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.data?.attributes?.urls?.customer_portal || null;
  } catch {
    return null;
  }
}
