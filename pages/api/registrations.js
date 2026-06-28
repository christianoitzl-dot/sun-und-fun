import { getDb, ensureSchema } from "../../lib/db";

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
    await db`
      INSERT INTO registrations (id, ts, data)
      VALUES (${record.id}, ${record.ts}, ${JSON.stringify(record)})
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id required" });
    await db`DELETE FROM registrations WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
