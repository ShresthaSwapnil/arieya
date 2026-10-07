import { NextResponse } from "next/server";
import { authorizeRequest, boundedString, jsonError, rateLimit, readJson } from "@/lib/http";
import { createLead } from "@/lib/store";

export async function POST(request: Request) {
  try {
    if (!authorizeRequest(request)) return jsonError("Origin not allowed", 403);
    const body = (await readJson(request, 4_000)) as Record<string, unknown>;
    const name = boundedString(body.name, 100, 2);
    const email = boundedString(body.email, 200, 5);
    const storeUrl = boundedString(body.storeUrl, 300, 8);
    if (!name || !email || !/^\S+@\S+\.\S+$/.test(email) || !storeUrl || !/^https?:\/\//.test(storeUrl)) return jsonError("Please check the form", 400);
    if (!await rateLimit(request, "lead", 5)) return jsonError("Please try again later", 429);
    await createLead(name, email, storeUrl);
    return NextResponse.json({ accepted: true }, { status: 201 });
  } catch {
    return jsonError("Please check the form", 400);
  }
}
