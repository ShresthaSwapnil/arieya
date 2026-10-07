import { NextResponse } from "next/server";
import { parseCatalog } from "@/lib/catalog";
import { authorizeRequest, boundedString, jsonError, rateLimit, readJson, tenantFor } from "@/lib/http";
import { getTrial, saveTrialCatalog } from "@/lib/trial";
import { getCatalog, getEdit } from "@/lib/store";
import { getTenantById } from "@/lib/merchant";
import { getDemoCatalog } from "@/lib/demo-catalogs";

export async function GET(request: Request) {
  try {
    if (!authorizeRequest(request)) return jsonError("Origin not allowed", 403);
    if (!await rateLimit(request, "catalog-read", 30)) return jsonError("Please try again in a minute.", 429);
    const params = new URL(request.url).searchParams;
    const token = boundedString(params.get("from"), 100);
    const edit = token ? await getEdit(token) : null;
    if (token && (!edit || edit.deletedAt || new Date(edit.expiresAt) <= new Date())) return jsonError("Shared edit unavailable", 404);
    const storeKey = params.get("store");
    const tenant = storeKey ? await tenantFor(storeKey) : edit ? (await getTenantById(edit.tenantId)) || await tenantFor("edita-demo") : await tenantFor("edita-demo");
    if (!tenant) return jsonError("Store not found", 404);
    const trial = tenant.id === "tenant_demo" ? await getTrial(request) : null;
    if (tenant.id === "tenant_demo" && !trial && !edit) return jsonError("Open the stylist to start your trial.", 401);
    const demoCatalog = tenant.id === "tenant_demo" ? getDemoCatalog(params.get("demoCategory")) : null;
    const catalog = edit?.catalogSnapshot || demoCatalog?.products || trial?.catalog || await getCatalog(tenant.id);
    const products = edit ? catalog.filter((product) => edit.productIds.includes(product.id)) : catalog;
    return NextResponse.json({ products, count: products.length }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Could not load the catalogue.", 503);
  }
}

export async function POST(request: Request) {
  try {
    if (!authorizeRequest(request)) return jsonError("Origin not allowed", 403);
    const trial = await getTrial(request);
    if (!trial) return jsonError("Open the stylist to start your trial.", 401);
    if (!await rateLimit(request, "catalog", 5)) return jsonError("Please try again in a minute.", 429);
    const body = await readJson(request, 2_100_000) as Record<string, unknown>;
    let products;
    try { products = body.products === null ? null : parseCatalog(body.products); }
    catch (error) { return jsonError(error instanceof Error ? error.message : "Invalid catalogue", 400); }
    await saveTrialCatalog(trial.id_hash, products);
    return NextResponse.json({ productCount: products?.length || 0, currency: products?.[0]?.currency || "GBP" });
  } catch (error) { return jsonError(error instanceof Error && error.message === "PAYLOAD_TOO_LARGE" ? "Catalogue must be under 2 MB." : "Could not save your catalogue.", 400); }
}
