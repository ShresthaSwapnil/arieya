import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isOpaqueToken } from "@/lib/core";
import { authorizeRequest, rateLimit, jsonError, readJson } from "@/lib/http";
import { addReaction, getEdit, recordEvent } from "@/lib/store";

const reactions = new Set(["love", "not_for_me", "compare"]);

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isOpaqueToken(token)) return jsonError("Edit not found", 404);
  try {
    if (!authorizeRequest(request)) return jsonError("Origin not allowed", 403);
    if (!await rateLimit(request, "reactions", 10)) return jsonError("Please try again later", 429);
    const body = (await readJson(request, 2_000)) as Record<string, unknown>;
    if (!reactions.has(String(body.reaction))) return jsonError("Invalid reaction", 400);
    const edit = await getEdit(token);
    if (!edit || edit.deletedAt || new Date(edit.expiresAt) <= new Date()) return jsonError("Edit not found", 404);
    const reaction = String(body.reaction);
    await addReaction(edit.tenantId, token, reaction);
    await recordEvent({
      eventId: randomUUID(), tenantId: edit.tenantId,
      anonymousSessionId: typeof body.sessionId === "string" ? body.sessionId.slice(0, 80) : `recipient-${randomUUID()}`,
      name: "edit_reaction", editId: token, numericProperties: {},
    });
    return NextResponse.json({ accepted: true });
  } catch {
    return jsonError("Invalid request", 400);
  }
}
