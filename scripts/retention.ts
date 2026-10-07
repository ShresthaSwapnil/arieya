import { runRetention } from "../lib/retention.ts";
import { sql } from "../lib/store.ts";
try { await runRetention(); console.log("Expired records removed."); }
finally { await sql?.end(); }
