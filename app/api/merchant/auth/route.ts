import { NextResponse } from "next/server";
import { boundedString, jsonError, rateLimit, readJson } from "@/lib/http";
import { createMerchantAccount, loginMerchant, logoutMerchant, merchantSession, switchMerchantStore } from "@/lib/merchant";
import { clearMerchantCookie, merchantToken, sameOrigin, setMerchantCookie } from "@/lib/merchant-http";
import { sql } from "@/lib/store";

function validStoreUrl(value: string) {
  try {
    const url = new URL(value);
    return !url.username && !url.password && (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)));
  } catch { return false; }
}

export async function GET(request: Request) {
  try {
    if (!sql) return jsonError("Merchant accounts need a configured database.", 503);
    const account = await merchantSession(merchantToken(request));
    return account ? NextResponse.json(account, { headers: { "Cache-Control": "no-store" } }) : jsonError("Sign in to continue.", 401);
  } catch { return jsonError("Merchant account unavailable.", 503); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Request origin not allowed.", 403);
  try {
    if (!sql) return jsonError("Merchant accounts need a configured database.", 503);
    const body = await readJson(request, 12_000) as Record<string, unknown>;
    const action = boundedString(body.action, 16, 3);
    const currentToken = merchantToken(request);

    if (action === "logout") {
      await logoutMerchant(currentToken);
      const response = NextResponse.json({ ok: true });
      clearMerchantCookie(response);
      return response;
    }
    if (action === "switch") {
      const tenantId = boundedString(body.tenantId, 80, 8);
      if (!tenantId || !await switchMerchantStore(currentToken, tenantId)) return jsonError("Store access not found.", 403);
      return NextResponse.json({ ok: true });
    }
    if (!["register", "login"].includes(action || "")) return jsonError("Invalid account action.", 400);
    if (!await rateLimit(request, `merchant-auth:${action}`, 10)) return jsonError("Too many attempts. Try again in a minute.", 429);
    const email = boundedString(body.email, 200, 5)?.toLowerCase();
    const password = typeof body.password === "string" && body.password.length >= 12 && body.password.length <= 200 ? body.password : null;
    if (!email || !/^\S+@\S+\.\S+$/.test(email) || !password) return jsonError("Enter a valid email and a password of at least 12 characters.", 400);

    let token: string | null;
    if (action === "register") {
      const name = boundedString(body.name, 100, 2);
      const storeName = boundedString(body.storeName, 100, 2);
      const storeUrl = boundedString(body.storeUrl, 500, 8);
      const currency = boundedString(body.currency, 3, 3)?.toUpperCase() || "GBP";
      if (!name || !storeName || !storeUrl || !validStoreUrl(storeUrl) || !["GBP", "USD", "EUR"].includes(currency)) return jsonError("Add your name, store name, a secure website URL, and GBP, USD, or EUR.", 400);
      token = await createMerchantAccount({ name, email, password, storeName, storeUrl, currency });
    } else {
      token = await loginMerchant(email, password);
      if (!token) return jsonError("Email or password is incorrect.", 401);
    }
    const account = await merchantSession(token);
    const response = NextResponse.json(account, { headers: { "Cache-Control": "no-store" } });
    setMerchantCookie(response, token, request);
    return response;
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof Error && error.message === "INVALID_JSON")) return jsonError("Invalid request.", 400);
    if (error instanceof Error && error.message === "PAYLOAD_TOO_LARGE") return jsonError("Request is too large.", 413);
    if (error instanceof Error && error.message === "DATABASE_REQUIRED") return jsonError("Merchant accounts need a configured database.", 503);
    if (error && typeof error === "object" && "code" in error && error.code === "23505") return jsonError("An account with this email already exists. Sign in instead.", 409);
    return jsonError("Could not complete the account request.", 503);
  }
}
