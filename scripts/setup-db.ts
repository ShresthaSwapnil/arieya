import { readFile } from "node:fs/promises";
import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const sql = postgres(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL, { prepare: false, max: 1, ssl: process.env.DATABASE_SSL === "false" ? false : "require" });
const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
await sql.unsafe(schema);
await sql`
  INSERT INTO tenants (id, public_key, name, approved_origins)
  VALUES ('tenant_demo', 'edita-demo', 'Arieya', '["http://localhost:3000"]')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
`;
await sql.end();
console.log("Arieya database is ready.");
