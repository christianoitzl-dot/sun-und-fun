import { getDb, ensureSchema } from "../../lib/db";
import { checkAdmin } from "../../lib/adminAuth";

// Prüft eine eingehende Anmeldung auf plausible Struktur, damit ungültige
// Requests einen sauberen 400er bekommen (statt 500 aus der DB-Schicht)
// und kein beliebiger Datenmüll gespeichert wird.
function validateRegistration(r) {
  if (!r || typeof r !== "object") return "Ungültiger Anfrageinhalt.";
  if (typeof r.id !== "string" || !r.id.startsWith("reg_") || r.id.length > 60)
    return "Ungültige id.";
  if (typeof r.ts !== "string" || Number.isNaN(Date.parse(r.ts)))
    return "Ungültiger Zeitstempel.";
  if (r.attending !== "yes" && r.attending !== "no") return "Ungültiger Status.";
  if (typeof r.nachname !== "string" || !r.nachname.trim() || r.nachname.length > 200)
    return "Ungültiger Nachname.";
  if (typeof r.vorname !== "string" || !r.vorname.trim() || r.vorname.length > 200)
    return "Ungültiger Vorname.";
  if (typeof r.partner !== "boolean") return "Ungültige Partner-Angabe.";
  if (typeof r.kids !== "number" || r.kids < 0 || r.kids > 20) return "Ungültige Kinderzahl.";
  if (typeof r.arrival !== "string" || r.arrival.length > 20) return "Ungültige Ankunftszeit.";
  if (typeof r.message !== "string" || r.message.length > 2000) return "Ungültige Nachricht.";
  if (!r.sportCounts || typeof r.sportCounts !== "object" || Array.isArray(r.sportCounts))
    return "Ungültige Sport-Angaben.";
  for (const v of Object.values(r.sportCounts)) {
    if (typeof v !== "number" || v < 0 || v > 99) return "Ungültige Sport-Angaben.";
  }
  return null;
}

export default async function handler(req, res) {
  await ensureSchema();
  const db = getDb();

  if (req.method === "GET") {
    const rows = await db`SELECT id, ts, data FROM registrations ORDER BY ts DESC`;
    const regs = rows.map((r) => ({ ...r.data, id: r.id, ts: r.ts }));
    return res.status(200).json(regs);
  }

  if (req.method === "POST") {
    const record = req.body;
    const problem = validateRegistration(record);
    if (problem) return res.status(400).json({ error: problem });
    await db`
      INSERT INTO registrations (id, ts, data)
      VALUES (${record.id}, ${record.ts}, ${JSON.stringify(record)})
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    if (!checkAdmin(req)) return res.status(401).json({ error: "Nicht berechtigt" });
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id required" });
    await db`DELETE FROM registrations WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
