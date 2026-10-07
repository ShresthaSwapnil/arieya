import { createHash, randomBytes } from "node:crypto";
import { sql } from "./store.ts";
import type { Product } from "./core.ts";

export type Trial = { id_hash: string; catalog: Product[] | null; questions_used: number; expires_at: Date };
const state = globalThis as typeof globalThis & { editaTrials?: Map<string, Trial>; editaLimits?: Map<string, { count: number; reset: number }> };
// ponytail: bounded process memory is local-only; Neon is mandatory on Vercel.
const trials = state.editaTrials ??= new Map<string, Trial>();
const limits = state.editaLimits ??= new Map<string, { count: number; reset: number }>();
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export function requireDatabase() {
  if (process.env.VERCEL && !sql) throw new Error("DATABASE_REQUIRED");
}
export function visitorKey(request: Request) {
  const salt = process.env.RATE_LIMIT_SALT;
  if (process.env.VERCEL && (!salt || salt === "replace-in-production")) throw new Error("RATE_LIMIT_SALT_REQUIRED");
  // Vercel overwrites x-forwarded-for. Do not deploy behind an untrusted proxy.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  return digest(`${salt || "local-only"}:${ip}`);
}
export async function consumeLimit(key: string, limit: number, windowMs = 60_000): Promise<boolean> {
  requireDatabase();
  if (sql) {
    const rows = await sql`
      INSERT INTO request_limits (key, count, reset_at) VALUES (${key}, 1, ${new Date(Date.now() + windowMs)})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN request_limits.reset_at <= now() THEN 1 ELSE request_limits.count + 1 END,
        reset_at = CASE WHEN request_limits.reset_at <= now() THEN EXCLUDED.reset_at ELSE request_limits.reset_at END
      WHERE request_limits.reset_at <= now() OR request_limits.count < ${limit}
      RETURNING count
    `;
    return rows.length > 0;
  }
  const now = Date.now();
  for (const [id, row] of limits) if (row.reset <= now) limits.delete(id);
  const current = limits.get(key);
  if (!current) { if (limits.size >= 10_000) return false; limits.set(key, { count: 1, reset: now + windowMs }); return true; }
  if (current.count >= limit) return false;
  current.count++;
  return true;
}
export async function getTrial(request: Request): Promise<Trial | null> {
  requireDatabase();
  const token = request.headers.get("cookie")?.match(/(?:^|;\s*)edita-trial=([A-Za-z0-9_-]{43})(?:;|$)/)?.[1];
  if (!token) return null;
  const id = digest(token);
  if (sql) {
    const [row] = await sql<Trial[]>`SELECT * FROM trial_sessions WHERE id_hash = ${id} AND expires_at > now()`;
    return row || null;
  }
  const row = trials.get(id);
  return row && row.expires_at > new Date() ? row : null;
}
export async function createTrial() {
  requireDatabase();
  const token = randomBytes(32).toString("base64url");
  const trial: Trial = { id_hash: digest(token), catalog: null, questions_used: 0, expires_at: new Date(Date.now() + 30 * 864e5) };
  if (sql) await sql`INSERT INTO trial_sessions (id_hash) VALUES (${trial.id_hash})`;
  else {
    for (const [id, row] of trials) if (row.expires_at <= new Date()) trials.delete(id);
    if (trials.size >= 1000) throw new Error("TRIAL_CAPACITY");
    trials.set(trial.id_hash, trial);
  }
  return { token, trial };
}
export async function claimQuestion(id: string) {
  if (sql) {
    const [row] = await sql<{ questions_used: number }[]>`UPDATE trial_sessions SET questions_used = questions_used + 1 WHERE id_hash = ${id} AND questions_used < 3 AND expires_at > now() RETURNING questions_used`;
    return row?.questions_used ?? null;
  }
  const row = trials.get(id);
  if (!row || row.expires_at <= new Date() || row.questions_used >= 3) return null;
  return ++row.questions_used;
}
export async function saveTrialCatalog(id: string, catalog: Product[] | null) {
  if (sql) await sql`UPDATE trial_sessions SET catalog = ${catalog ? sql.json(catalog) : null} WHERE id_hash = ${id} AND expires_at > now()`;
  else { const row = trials.get(id); if (row) row.catalog = catalog; }
}
