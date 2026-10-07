import "server-only";
import { NextResponse } from "next/server";
import { TENANTS } from "./core";
import { getTenantByPublicKey } from "./merchant.ts";
import { consumeLimit, visitorKey } from "./trial";

export type Tenant = { id: string; publicKey: string; name: string; approvedOrigins: string[]; contactUrl: string; currency: string; status?: string; storeUrl?: string };
export async function tenantFor(publicKey: unknown): Promise<Tenant | null> {
  if (typeof publicKey !== "string" || publicKey.length > 100) return null;
  if (Object.hasOwn(TENANTS, publicKey)) return TENANTS[publicKey as keyof typeof TENANTS];
  const store = await getTenantByPublicKey(publicKey);
  return store ? { ...store, contactUrl: store.storeUrl || "", currency: store.currency } : null;
}
export function authorizeRequest(request: Request, tenant?: Tenant) {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  const allowed = [new URL(request.url).origin, process.env.NEXT_PUBLIC_APP_ORIGIN,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    ...(tenant?.approvedOrigins || [])];
  return allowed.includes(origin);
}
export function rateLimit(request: Request, scope: string, limit = 30) {
  return consumeLimit(`${scope}:${visitorKey(request)}`, limit);
}
export async function readJson(request: Request, maxBytes = 32_000): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new Error("INVALID_JSON");
  if (Number(request.headers.get("content-length") || 0) > maxBytes) throw new Error("PAYLOAD_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_JSON");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new Error("PAYLOAD_TOO_LARGE"); }
    chunks.push(value);
  }
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("INVALID_JSON");
  return body;
}
export const jsonError = (message: string, status: number) => NextResponse.json({ error: message }, { status });
export function boundedString(value: unknown, max: number, min = 0) {
  return typeof value === "string" && value.trim().length >= min && value.length <= max ? value.trim() : null;
}
