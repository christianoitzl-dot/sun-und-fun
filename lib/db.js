import { neon } from "@neondatabase/serverless";

let sql;

export function getDb() {
  if (!sql) {
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

// Die Tabellen müssen nur einmal pro laufender Serverless-Instanz angelegt
// werden. Ohne diesen Guard lief bei JEDEM Request zweimal CREATE TABLE
// (zwei zusätzliche DB-Round-Trips) — das machte jede Anmeldung spürbar
// langsamer. Gleiches Muster wie in pages/api/photos.js.
let schemaReady = false;

export async function ensureSchema() {
  if (schemaReady) return;
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
  schemaReady = true;
}
