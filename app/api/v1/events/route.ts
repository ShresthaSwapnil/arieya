import { isEventName } from "@/lib/core";
import { authorizeRequest, boundedString, jsonError, rateLimit, readJson, tenantFor } from "@/lib/http";
import { getCatalog, recordEvent } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = (await readJson(request, 8_000)) as Record<string, unknown>;
    if (!await rateLimit(request, "tenant-lookup", 240)) return jsonError("Event rejected", 403);
    const tenant = await tenantFor(body.tenant);
    const eventId = boundedString(body.eventId, 80, 8);
    const sessionId = boundedString(body.sessionId, 80, 8);
    if (!tenant || !eventId || !sessionId || !isEventName(body.name)) return jsonError("Invalid event", 400);
    if (!authorizeRequest(request, tenant) || !await rateLimit(request, `events:${tenant.id}`, 120)) return jsonError("Event rejected", 403);
    if (!["stylist_opened", "conversation_started", "message_submitted", "product_impression", "product_clicked", "edit_opened", "edit_shared", "recipient_product_clicked", "handoff_clicked"].includes(body.name)) return jsonError("Server event cannot be submitted by clients", 400);
    const productId = boundedString(body.productId, 100) || undefined;
    if (["product_impression", "product_clicked"].includes(body.name) && !productId) return jsonError("Product event requires a product ID", 400);
    if (productId && tenant.id !== "tenant_demo") {
      const catalog = await getCatalog(tenant.id);
      if (!catalog.some((product) => product.id === productId)) return jsonError("Product does not belong to this store", 400);
    }
    const rawProperties = body.numericProperties && typeof body.numericProperties === "object"
      ? (body.numericProperties as Record<string, unknown>)
      : {};
    const numericProperties = Object.fromEntries(
      Object.entries(rawProperties)
        .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
        .slice(0, 10),
    ) as Record<string, number>;
    await recordEvent({
      eventId, tenantId: tenant.id, anonymousSessionId: sessionId, name: body.name,
      productId,
      editId: boundedString(body.editId, 100) || undefined,
      matchStatus: boundedString(body.matchStatus, 30) || undefined,
      latencyMs: typeof body.latencyMs === "number" && Number.isFinite(body.latencyMs) ? Math.min(120000, Math.max(0, Math.round(body.latencyMs))) : undefined,
      modelPath: boundedString(body.modelPath, 30) || undefined,
      numericProperties,
    });
    return new Response(null, { status: 204 });
  } catch {
    return jsonError("Invalid event", 400);
  }
}
