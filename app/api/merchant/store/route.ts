import { NextResponse } from "next/server";
import { boundedString, jsonError, rateLimit, readJson } from "@/lib/http";
import { merchantSession, updateMerchantStore } from "@/lib/merchant";
import { merchantToken, sameOrigin } from "@/lib/merchant-http";
import { sql } from "@/lib/store";

function validStoreUrl(value: string) {
  try {
    const url = new URL(value);
    return !url.username && !url.password && (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)));
  } catch { return false; }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return jsonError("Request origin not allowed.", 403);
  try {
    if (!sql) return jsonError("Merchant accounts need a configured database.", 503);
    if (!await rateLimit(request, "merchant-store-settings", 20)) return jsonError("Please try again in a minute.", 429);
    const account = await merchantSession(merchantToken(request));
    if (!account) return jsonError("Sign in to continue.", 401);
    const body = await readJson(request, 8_000) as Record<string, unknown>;
    const name = boundedString(body.name, 100, 2);
    const storeUrl = boundedString(body.storeUrl, 500, 8);
    const currency = boundedString(body.currency, 3, 3)?.toUpperCase();
    if (!name || !storeUrl || !validStoreUrl(storeUrl) || !currency || !["GBP", "USD", "EUR"].includes(currency)) return jsonError("Add a valid store name, secure website URL, and currency.", 400);
    await updateMerchantStore(account.tenantId, { name, storeUrl, currency });
    return NextResponse.json({ ok: true });
  } catch { return jsonError("Could not save store settings.", 503); }
}
