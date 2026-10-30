import { NextResponse } from "next/server";
import { boundedString, jsonError, normalizeStoreUrl, rateLimit, readJson } from "@/lib/http";
import { addMerchantStore, merchantSession } from "@/lib/merchant";
import { merchantToken, sameOrigin } from "@/lib/merchant-http";
import { sql } from "@/lib/store";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Request origin not allowed.", 403);
  try {
    if (!sql) return jsonError("Merchant accounts need a configured database.", 503);
    if (!await rateLimit(request, "merchant-stores", 10)) return jsonError("Please try again in a minute.", 429);
    const token = merchantToken(request);
    const account = await merchantSession(token);
    if (!account || !token) return jsonError("Sign in to continue.", 401);
    const body = await readJson(request, 8_000) as Record<string, unknown>;
    const name = boundedString(body.name, 100, 2);
    const storeUrl = normalizeStoreUrl(body.storeUrl);
    const currency = boundedString(body.currency, 3, 3)?.toUpperCase() || "USD";
    if (!name || !storeUrl || !["GBP", "USD", "EUR"].includes(currency)) return jsonError("Add a valid store name and domain (e.g. yourstore.com).", 400);
    await addMerchantStore(account.userId, token, { name, storeUrl, currency });
    return NextResponse.json({ ok: true });
  } catch { return jsonError("Could not add this store.", 503); }
}
