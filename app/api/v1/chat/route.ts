import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { recommend } from "@/lib/core";
import { authorizeRequest, boundedString, jsonError, rateLimit, readJson, tenantFor } from "@/lib/http";
import { extractSoftIntent, type ChatTurn } from "@/lib/model";
import { getCatalog, getEdit, recordEvent } from "@/lib/store";
import { getDemoCatalog } from "@/lib/demo-catalogs";

import { claimQuestion, consumeLimit, getTrial, visitorKey } from "@/lib/trial";

export const maxDuration = 30;

export async function POST(request: Request) {
  const started = Date.now();
  try {
    const body = (await readJson(request)) as Record<string, unknown>;
    if (!await rateLimit(request, "tenant-lookup", 240)) return jsonError("Too many requests", 429);
    const tenant = await tenantFor(body.tenant);
    const message = boundedString(body.message, 500, 1);
    const sessionId = boundedString(body.sessionId, 80, 8);
    const requestedCurrency = typeof body.currency === "string" && /^[A-Z]{3}$/.test(body.currency) ? body.currency : null;
    const seen = Array.isArray(body.seenProductIds)
      ? body.seenProductIds.filter((item): item is string => typeof item === "string" && item.length <= 100).slice(0, 20)
      : [];
    const historyValid =
      body.history === undefined ||
      (Array.isArray(body.history) &&
        body.history.length <= 8 &&
        body.history.every(
          (turn) =>
            turn &&
            typeof turn === "object" &&
            ["user", "assistant"].includes(String((turn as Record<string, unknown>).role)) &&
            typeof (turn as Record<string, unknown>).content === "string" &&
            String((turn as Record<string, unknown>).content).length <= 500,
        ));
    const cartValid =
      body.cartVariantIds === undefined ||
      (Array.isArray(body.cartVariantIds) &&
        body.cartVariantIds.length <= 20 &&
        body.cartVariantIds.every((item) => typeof item === "string" && item.length <= 100));
    if (!tenant || !message || !sessionId || !historyValid || !cartValid) return jsonError("Invalid request", 400);
    const history = (Array.isArray(body.history) ? body.history : []) as ChatTurn[];
    const currency = requestedCurrency || tenant.currency;
    if (!authorizeRequest(request, tenant)) return jsonError("Origin not allowed", 403);
    if (!await rateLimit(request, `chat:${tenant.id}`)) {
      await recordEvent({
        eventId: randomUUID(), tenantId: tenant.id, anonymousSessionId: sessionId,
        name: "rate_limited", numericProperties: {},
      });
      return jsonError("Too many requests", 429);
    }

    const isPreviewStore = tenant.id === "tenant_demo" || tenant.status === "preview";
    const trial = isPreviewStore ? await getTrial(request) : null;
    if (tenant.id === "tenant_demo" && !trial) return jsonError("Open the stylist to start your three-question trial.", 401);
    if (trial && trial.questions_used >= 3) {
      return jsonError(tenant.status === "preview"
        ? "You’ve used your 3 preview test questions! Choose a plan in Merchant Studio to unlock unlimited discovery."
        : "You’ve used your three trial questions. Thanks for trying Arieya!", 429);
    }
    const from = typeof body.fromEdit === "string" ? await getEdit(body.fromEdit) : null;
    if (body.fromEdit && (!from || from.deletedAt || new Date(from.expiresAt) <= new Date())) return jsonError("This shared edit is no longer available.", 404);
    const demoCatalog = tenant.id === "tenant_demo" ? getDemoCatalog(body.demoCategory) : null;
    const catalog = from?.catalogSnapshot || demoCatalog?.products || trial?.catalog || await getCatalog(tenant.id);
    if (trial && !await consumeLimit(`trial-ip:${visitorKey(request)}`, 3, 30 * 864e5)) return jsonError("The three-question trial limit for this network has been reached.", 429);
    const used = trial ? await claimQuestion(trial.id_hash) : null;
    if (trial && used === null) return jsonError("You’ve used your three trial questions.", 429);
    const modelAllowed = await consumeLimit("gemini-daily", 300, 864e5);
    const intent = modelAllowed ? await extractSoftIntent(message, history, catalog) : { tags: [], path: "deterministic" as const, model: null };
    // Only allowlisted tags come from Gemini. Product facts and shopper-facing text stay deterministic.
    const finalResult = recommend(message, catalog, seen, intent.tags, catalog[0]?.currency || currency, history);
    const modelPath = intent.path;
    const latencyMs = Date.now() - started;
    await recordEvent({
      eventId: randomUUID(),
      tenantId: tenant.id,
      anonymousSessionId: sessionId,
      name: finalResult.status === "no_match" ? "no_exact_match" : finalResult.status === "handoff" ? "handoff_shown" : "recommendations_returned",
      matchStatus: finalResult.status,
      latencyMs,
      modelPath,
      numericProperties: { resultCount: finalResult.products.length },
    }).catch(() => console.error("Chat analytics write failed"));
    if (modelPath === "fallback") {
      await recordEvent({
        eventId: randomUUID(), tenantId: tenant.id, anonymousSessionId: sessionId,
        name: "fallback_used", latencyMs, modelPath, numericProperties: {},
      }).catch(() => console.error("Fallback analytics write failed"));
    }
    return NextResponse.json({ ...finalResult, remaining: used === null ? null : 3 - used, modelPath, model: modelPath === "gemini" ? intent.model : null, latencyMs });
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof Error && error.message === "INVALID_JSON")) return jsonError("Invalid JSON request", 400);
    return jsonError(error instanceof Error && error.message === "PAYLOAD_TOO_LARGE" ? "Payload too large" : "Stylist temporarily unavailable. Please try again later.", error instanceof Error && error.message === "PAYLOAD_TOO_LARGE" ? 413 : 503);
  }
}
