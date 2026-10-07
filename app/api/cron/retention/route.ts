import { runRetention } from "@/lib/retention";
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Unauthorized", { status: 401 });
  await runRetention();
  return Response.json({ ok: true });
}
