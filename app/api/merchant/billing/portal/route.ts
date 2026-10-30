import { NextResponse } from "next/server";
import { jsonError, rateLimit } from "@/lib/http";
import { merchantSession, updateTenantSubscription } from "@/lib/merchant";
import { merchantToken } from "@/lib/merchant-http";
import { sql } from "@/lib/store";
import { getCustomerPortalUrl } from "@/lib/lemonsqueezy";

export async function GET(request: Request) {
  try {
    if (!sql) return jsonError("Database connection is required.", 503);
    if (!await rateLimit(request, "merchant-portal", 30)) {
      return jsonError("Too many requests. Please wait a moment.", 429);
    }

    const session = await merchantSession(merchantToken(request));
    if (!session) return jsonError("Sign in to manage your subscription.", 401);

    const [tenant] = await sql<{
      customer_id: string | null;
      billing_portal_url: string | null;
      subscription_status: string;
    }[]>`
      SELECT customer_id, billing_portal_url, subscription_status
      FROM tenants WHERE id = ${session.tenantId} LIMIT 1`;

    if (!tenant || !tenant.customer_id) {
      return jsonError("No active billing account found for this store.", 404);
    }

    let portalUrl = tenant.billing_portal_url;
    if (!portalUrl) {
      portalUrl = await getCustomerPortalUrl(tenant.customer_id);
      if (portalUrl) {
        await updateTenantSubscription(session.tenantId, { billingPortalUrl: portalUrl });
      }
    }

    if (!portalUrl) {
      return jsonError("Could not retrieve billing portal. Please contact support.", 502);
    }

    return NextResponse.json({ portalUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open billing portal.";
    return jsonError(message, 500);
  }
}
