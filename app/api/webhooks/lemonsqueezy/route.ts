import { NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  getPlanFromVariant,
  getAllowanceForPlan,
} from "@/lib/lemonsqueezy";
import {
  updateTenantSubscription,
  findTenantBySubscriptionOrCustomer,
  recordBillingEvent,
} from "@/lib/merchant";
import { sql } from "@/lib/store";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    if (!sql) {
      return NextResponse.json({ error: "Database not connected" }, { status: 503 });
    }

    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!secret) {
      console.warn("LEMONSQUEEZY_WEBHOOK_SECRET is not configured; rejecting webhook");
      return NextResponse.json({ error: "Webhook secret missing" }, { status: 500 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get("x-signature");

    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      console.warn("Lemon Squeezy signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as {
      meta?: {
        event_name?: string;
        custom_data?: {
          tenant_id?: string;
          user_id?: string;
          plan?: string;
        };
      };
      data?: {
        id?: string;
        attributes?: {
          customer_id?: number | string;
          variant_id?: number | string;
          status?: string;
          renews_at?: string | null;
          ends_at?: string | null;
          trial_ends_at?: string | null;
          card_brand?: string | null;
          card_last_four?: string | null;
          urls?: {
            customer_portal?: string;
          };
          first_subscription_item?: {
            id?: number;
            subscription_id?: number;
            variant_id?: number;
          };
        };
      };
    };

    const eventName = payload.meta?.event_name;
    const subscriptionId = payload.data?.id ? String(payload.data.id) : undefined;
    const attributes = payload.data?.attributes;
    const customerId = attributes?.customer_id ? String(attributes.customer_id) : undefined;
    const variantId = attributes?.variant_id || attributes?.first_subscription_item?.variant_id;
    const customTenantId = payload.meta?.custom_data?.tenant_id;

    if (!eventName) {
      return NextResponse.json({ error: "No event name in webhook payload" }, { status: 400 });
    }

    // Resolve tenant ID: first from custom metadata, or fallback to matching subscription/customer ID
    let tenantId = customTenantId;
    if (!tenantId) {
      const match = await findTenantBySubscriptionOrCustomer(subscriptionId, customerId);
      tenantId = match?.id;
    }

    if (!tenantId) {
      console.warn(`Lemon Squeezy webhook [${eventName}]: Could not resolve tenant ID`, {
        subscriptionId,
        customerId,
        custom: payload.meta?.custom_data,
      });
      // Acknowledge so Lemon Squeezy does not infinitely retry unmatchable events
      return NextResponse.json({ received: true, matched: false });
    }

    // Record the audit log entry
    await recordBillingEvent(tenantId, eventName, subscriptionId || customerId || null, payload);

    switch (eventName) {
      case "subscription_created":
      case "subscription_updated": {
        const resolvedPlan = variantId ? getPlanFromVariant(variantId) : (payload.meta?.custom_data?.plan || "growth");
        const allowance = getAllowanceForPlan(resolvedPlan);
        const status = attributes?.status || "active";

        await updateTenantSubscription(tenantId, {
          plan: resolvedPlan,
          subscriptionId,
          customerId,
          variantId: variantId ? String(variantId) : undefined,
          subscriptionStatus: status,
          sessionAllowance: allowance,
          renewsAt: attributes?.renews_at ? new Date(attributes.renews_at) : null,
          endsAt: attributes?.ends_at ? new Date(attributes.ends_at) : null,
          trialEndsAt: attributes?.trial_ends_at ? new Date(attributes.trial_ends_at) : null,
          cardBrand: attributes?.card_brand || null,
          cardLastFour: attributes?.card_last_four || null,
          billingPortalUrl: attributes?.urls?.customer_portal || null,
        });
        break;
      }

      case "subscription_cancelled": {
        await updateTenantSubscription(tenantId, {
          subscriptionStatus: "cancelled",
          endsAt: attributes?.ends_at ? new Date(attributes.ends_at) : null,
        });
        break;
      }

      case "subscription_resumed": {
        await updateTenantSubscription(tenantId, {
          subscriptionStatus: "active",
          renewsAt: attributes?.renews_at ? new Date(attributes.renews_at) : null,
          endsAt: null,
        });
        break;
      }

      case "subscription_expired": {
        // Gracefully downgrade to founding preview allowance
        await updateTenantSubscription(tenantId, {
          plan: "founding",
          subscriptionStatus: "expired",
          sessionAllowance: 500,
          endsAt: new Date(),
        });
        break;
      }

      case "subscription_paused": {
        await updateTenantSubscription(tenantId, {
          subscriptionStatus: "paused",
        });
        break;
      }

      case "subscription_unpaused": {
        await updateTenantSubscription(tenantId, {
          subscriptionStatus: "active",
          renewsAt: attributes?.renews_at ? new Date(attributes.renews_at) : null,
        });
        break;
      }

      case "order_created": {
        // Single order / lifetime pass or initial payment
        if (customerId) {
          await updateTenantSubscription(tenantId, {
            customerId,
            billingPortalUrl: attributes?.urls?.customer_portal || null,
          });
        }
        break;
      }

      default:
        console.log(`Lemon Squeezy event [${eventName}] acknowledged without state change.`);
    }

    return NextResponse.json({ received: true, tenantId, event: eventName });
  } catch (error) {
    console.error("Lemon Squeezy webhook handling error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
