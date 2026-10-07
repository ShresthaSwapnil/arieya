import { NextResponse } from "next/server";
import { boundedString, jsonError, rateLimit, readJson } from "@/lib/http";
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
    const storeUrl = boundedString(body.storeUrl, 500, 8);
    const currency = boundedString(body.currency, 3, 3)?.toUpperCase() || "GBP";
    let url: URL | null = null;
    try { url = storeUrl ? new URL(storeUrl) : null; } catch { /* invalid form field */ }
    if (!name || !url || url.username || url.password || (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) || !["GBP", "USD", "EUR"].includes(currency)) return jsonError("Add a valid store name, secure website URL, and currency.", 400);
    await addMerchantStore(account.userId, token, { name, storeUrl: url.toString(), currency });
    return NextResponse.json({ ok: true });
  } catch { return jsonError("Could not add this store.", 503); }
}
