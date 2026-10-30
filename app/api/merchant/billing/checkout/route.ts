import { NextResponse } from "next/server";
import { jsonError, rateLimit, readJson } from "@/lib/http";
import { merchantSession } from "@/lib/merchant";
import { merchantToken } from "@/lib/merchant-http";
import { sql } from "@/lib/store";
import { createCheckout, PLANS, type PlanId } from "@/lib/lemonsqueezy";

export async function POST(request: Request) {
  try {
    if (!sql) return jsonError("Database connection is required.", 503);
    if (!await rateLimit(request, "merchant-checkout", 20)) {
      return jsonError("Too many checkout requests. Please wait a moment.", 429);
    }

    const session = await merchantSession(merchantToken(request));
    if (!session) return jsonError("Sign in to choose a subscription plan.", 401);

    const body = (await readJson(request)) as { plan?: string; returnUrl?: string };
    const planId = (body.plan || "growth") as PlanId;
    if (!PLANS[planId]) {
      return jsonError("Invalid subscription plan selected.", 400);
    }

    const activeStore = session.stores.find((s) => s.id === session.tenantId);
    const storeName = activeStore?.name || "Online store";

    const { checkoutUrl } = await createCheckout({
      tenantId: session.tenantId,
      userId: session.userId,
      userEmail: session.email,
      userName: session.name,
      planId,
      storeName,
      redirectUrl: body.returnUrl,
    });

    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not initialize checkout.";
    return jsonError(message, 500);
  }
}
