import { sql } from "@vercel/postgres";

export { sql };

export async function ensureEnv() {
  if (!process.env.POSTGRES_URL && !process.env.POSTGRES_PRISMA_URL) {
    throw new Error(
      "POSTGRES_URL is not set. Run `vercel env pull .env.local` after linking the project.",
    );
  }
}
