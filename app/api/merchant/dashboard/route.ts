import { NextResponse } from "next/server";
import { jsonError, rateLimit } from "@/lib/http";
import { merchantDashboard, merchantSession } from "@/lib/merchant";
import { merchantToken } from "@/lib/merchant-http";
import { sql } from "@/lib/store";

export async function GET(request: Request) {
  try {
    if (!sql) return jsonError("Merchant accounts need a configured database.", 503);
    if (!await rateLimit(request, "merchant-dashboard", 60)) return jsonError("Please try again in a minute.", 429);
    const account = await merchantSession(merchantToken(request));
    if (!account) return jsonError("Sign in to continue.", 401);
    const dashboard = await merchantDashboard(account);
    return dashboard ? NextResponse.json(dashboard, { headers: { "Cache-Control": "no-store" } }) : jsonError("Store not found.", 404);
  } catch { return jsonError("Could not load the store dashboard.", 503); }
}
