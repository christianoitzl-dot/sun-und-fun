import { getDb, ensureSchema } from "../../lib/db";
import { checkAdmin } from "../../lib/adminAuth";

// Nur diese Schlüssel werden gespeichert — Altlasten aus früheren Versionen
// (Hotel-Links, Foto-Album usw.) fliegen damit beim nächsten Speichern raus.
const ALLOWED_KEYS = ["spotify", "giftText"];

export default async function handler(req, res) {
  await ensureSchema();
  const db = getDb();

  if (req.method === "GET") {
    const rows = await db`SELECT value FROM app_settings WHERE key = 'main'`;
    if (rows.length === 0) return res.status(200).json(null);
    return res.status(200).json(rows[0].value);
  }

  if (req.method === "PUT") {
    if (!checkAdmin(req)) return res.status(401).json({ error: "Nicht berechtigt" });
    const body = req.body;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "Ungültiger Anfrageinhalt." });
    }
    const value = {};
    for (const k of ALLOWED_KEYS) {
      if (typeof body[k] === "string") value[k] = body[k];
    }
    await db`
      INSERT INTO app_settings (key, value)
      VALUES ('main', ${JSON.stringify(value)})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
