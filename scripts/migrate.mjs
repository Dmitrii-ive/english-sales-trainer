#!/usr/bin/env node
// Run all .sql files in /migrations against POSTGRES_URL (idempotent — files use IF NOT EXISTS).
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Client } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });
config({ path: join(__dirname, "..", ".env") });

const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("POSTGRES_URL is not set. Run `vercel env pull .env.local` first.");
  process.exit(1);
}

const client = new Client({ connectionString: url });
await client.connect();

const dir = join(__dirname, "..", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

for (const f of files) {
  const sql = readFileSync(join(dir, f), "utf8");
  process.stdout.write(`→ ${f}… `);
  await client.query(sql);
  console.log("ok");
}

await client.end();
console.log("Done.");
