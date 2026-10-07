import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { authorizeRequest, boundedString, jsonError, rateLimit, readJson, tenantFor } from "@/lib/http";
import { getTrial } from "@/lib/trial";
import { createEdit, getCatalog, getEdit, recordEvent } from "@/lib/store";
import { getDemoCatalog } from "@/lib/demo-catalogs";

export async function POST(request: Request) {
  try {
    const body = (await readJson(request, 16_000)) as Record<string, unknown>;
    if (!await rateLimit(request, "tenant-lookup", 240)) return jsonError("Too many requests", 429);
    const tenant = await tenantFor(body.tenant);
    const sessionId = boundedString(body.sessionId, 80, 8);
    const intentSummary = boundedString(body.intentSummary, 240, 3);
    const productIds = Array.isArray(body.productIds)
      ? [...new Set(body.productIds.filter((item): item is string => typeof item === "string" && item.length <= 100))].slice(0, 4)
      : [];
    if (!tenant || !sessionId || !intentSummary || !productIds.length) return jsonError("Invalid request", 400);
    if (!authorizeRequest(request, tenant)) return jsonError("Origin not allowed", 403);
    if (!await rateLimit(request, `edits:${tenant.id}`, 20)) return jsonError("Too many requests", 429);
    const trial = tenant.id === "tenant_demo" ? await getTrial(request) : null;
    if (tenant.id === "tenant_demo" && !trial) return jsonError("Trial session required", 401);
    const from = typeof body.fromEdit === "string" ? await getEdit(body.fromEdit) : null;
    if (body.fromEdit && (!from || from.deletedAt || new Date(from.expiresAt) <= new Date())) return jsonError("Shared edit unavailable", 404);
    const demoCatalog = tenant.id === "tenant_demo" ? getDemoCatalog(body.demoCategory) : null;
    const snapshot = from?.catalogSnapshot || demoCatalog?.products || trial?.catalog;
    const catalog = snapshot || await getCatalog(tenant.id);
    const verified = productIds.filter((id) => catalog.some((product) => product.id === id && product.available));
    if (verified.length !== productIds.length) return jsonError("Only current, available products can be shared", 409);
    const requestedReasons = body.selectionReasons && typeof body.selectionReasons === "object"
      ? (body.selectionReasons as Record<string, unknown>)
      : {};
    const selectionReasons = Object.fromEntries(
      verified.map((id) => [id, boundedString(requestedReasons[id], 180) || "Selected from the verified edit."]),
    );
    const { edit, managementToken } = await createEdit({
      tenantId: tenant.id, creatorSessionId: sessionId, intentSummary,
      productIds: verified, selectionReasons,
      catalogSnapshot: snapshot ? catalog.filter((product) => verified.includes(product.id)) : undefined,
    });
    await recordEvent({
      eventId: randomUUID(), tenantId: tenant.id, anonymousSessionId: sessionId,
      name: "edit_created", editId: edit.token, numericProperties: { productCount: verified.length },
    });
    return NextResponse.json({ token: edit.token, managementToken, expiresAt: edit.expiresAt, url: `/e/${edit.token}` }, { status: 201 });
  } catch {
    return jsonError("Invalid request", 400);
  }
}
