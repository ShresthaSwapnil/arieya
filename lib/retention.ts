import { sql } from "./store.ts";
export async function runRetention() {
  if (!sql) throw new Error("DATABASE_URL is required");
  await sql.begin(async (tx) => {
    await tx`DELETE FROM trial_sessions WHERE expires_at <= now()`;
    await tx`DELETE FROM merchant_sessions WHERE expires_at <= now()`;
    await tx`DELETE FROM request_limits WHERE reset_at <= now()`;
    await tx`DELETE FROM shareable_edits WHERE expires_at <= now() OR deleted_at IS NOT NULL`;
    await tx`DELETE FROM analytics_events WHERE created_at < now() - interval '13 months'`;
    await tx`DELETE FROM tenants WHERE deletion_scheduled_at <= now()`;
    await tx`DELETE FROM merchant_users u WHERE NOT EXISTS (SELECT 1 FROM merchant_memberships m WHERE m.user_id = u.id)`;
  });
}
