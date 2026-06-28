import { neon } from "@neondatabase/serverless";

let sql;

export function getDb() {
  if (!sql) {
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

export async function ensureSchema() {
  const db = getDb();
  await db`
    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      ts TIMESTAMPTZ NOT NULL,
      data JSONB NOT NULL
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL
    )
  `;
}
