import { NextResponse } from "next/server";
import { parseCatalog } from "@/lib/catalog";
import { jsonError, rateLimit, readJson } from "@/lib/http";
import { merchantSession, saveMerchantCatalog } from "@/lib/merchant";
import { merchantToken, sameOrigin } from "@/lib/merchant-http";
import { sql } from "@/lib/store";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Request origin not allowed.", 403);
  try {
    if (!sql) return jsonError("Merchant accounts need a configured database.", 503);
    if (!await rateLimit(request, "merchant-catalog", 5)) return jsonError("Please try again in a minute.", 429);
    const account = await merchantSession(merchantToken(request));
    if (!account) return jsonError("Sign in to continue.", 401);
    const body = await readJson(request, 4_200_000) as Record<string, unknown>;
    let products;
    try { products = parseCatalog(body.products, account.stores.find((store) => store.id === account.tenantId)?.currency || "GBP"); }
    catch (error) { return jsonError(error instanceof Error ? error.message : "Invalid catalogue.", 400); }
    await saveMerchantCatalog(account.tenantId, products);
    return NextResponse.json({ productCount: products.length, currency: products[0].currency });
  } catch (error) {
    if (error instanceof Error && error.message === "PAYLOAD_TOO_LARGE") return jsonError("Catalogue must be under 2 MB.", 413);
    if (error instanceof Error && error.message === "INVALID_JSON") return jsonError("Invalid catalogue data.", 400);
    return jsonError("Could not save the catalogue.", 503);
  }
}
