import { getDb, ensureSchema } from "../../lib/db";

export default async function handler(req, res) {
  await ensureSchema();
  const db = getDb();

  if (req.method === "GET") {
    const rows = await db`SELECT value FROM app_settings WHERE key = 'main'`;
    if (rows.length === 0) return res.status(200).json(null);
    return res.status(200).json(rows[0].value);
  }

  if (req.method === "PUT") {
    const value = req.body;
    await db`
      INSERT INTO app_settings (key, value)
      VALUES ('main', ${JSON.stringify(value)})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
