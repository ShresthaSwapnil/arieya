import { NextResponse } from "next/server";
import { authorizeRequest, jsonError, rateLimit, tenantFor } from "@/lib/http";
import { createTrial, getTrial } from "@/lib/trial";
import { getDemoCatalog } from "@/lib/demo-catalogs";
import { getCatalog } from "@/lib/store";

export async function GET(request: Request) {
  try {
    if (!authorizeRequest(request)) return jsonError("Origin not allowed", 403);
    if (!await rateLimit(request, "tenant-lookup", 240)) return jsonError("Please try again in a minute.", 429);
    const params = new URL(request.url).searchParams;
    const storeKey = params.get("store") || "edita-demo";
    const tenant = await tenantFor(storeKey);
    if (!tenant) return jsonError("Store not found", 404);
    if (tenant.id !== "tenant_demo") {
      if (!await rateLimit(request, `store-preview:${tenant.id}`, 60)) return jsonError("Please try again in a minute.", 429);
      const catalog = await getCatalog(tenant.id);
      return NextResponse.json({ remaining: null, productCount: catalog.length, currency: catalog[0]?.currency || tenant.currency }, { headers: { "Cache-Control": "no-store" } });
    }
    let trial = await getTrial(request);
    let token: string | undefined;
    if (!trial) {
      if (!await rateLimit(request, "trial", 10)) return jsonError("Please try again later", 429);
      ({ trial, token } = await createTrial());
    }
    const demoCatalog = getDemoCatalog(params.get("demoCategory"));
    const catalog = demoCatalog?.products || trial.catalog;
    const response = NextResponse.json({ remaining: 3 - trial.questions_used, productCount: catalog?.length || 0, currency: catalog?.[0]?.currency || "GBP" }, { headers: { "Cache-Control": "no-store" } });
    if (token) response.cookies.set("edita-trial", token, { httpOnly: true, sameSite: "lax", secure: new URL(request.url).protocol === "https:", path: "/", maxAge: 30 * 86400 });
    return response;
  } catch { return jsonError("Trial is temporarily unavailable. Please try again later.", 503); }
}
