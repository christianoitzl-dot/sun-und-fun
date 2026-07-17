import { getDb } from "../../lib/db";
import { del } from "@vercel/blob";
import { checkAdmin } from "../../lib/adminAuth";

// Legt die photos-Tabelle bei Bedarf an — unabhängig von ensureSchema() in
// lib/db.js, damit diese Datei ohne Änderung an lib/db.js funktioniert.
// (Gleiches Muster wie registrations/app_settings: einfache Tabelle,
// hier aber mit eigenen Spalten statt key/JSONB, weil wir gezielt nach
// Kategorie/Datum filtern und sortieren wollen.)
let schemaReady = false;
async function ensurePhotosTable(sql) {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS photos (
      id SERIAL PRIMARY KEY,
      url TEXT NOT NULL,
      category TEXT NOT NULL,
      filename TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  // Nachträglich ergänzt (Uploader-Name) — ALTER statt nur CREATE, damit eine
  // bereits bestehende Tabelle die Spalte auch bekommt.
  await sql`ALTER TABLE photos ADD COLUMN IF NOT EXISTS uploader TEXT`;
  schemaReady = true;
}

export default async function handler(req, res) {
  const sql = getDb();
  await ensurePhotosTable(sql);

  if (req.method === "GET") {
    const { category } = req.query;
    const rows =
      category && category !== "alle"
        ? await sql`SELECT id, url, category, filename, uploader, created_at FROM photos WHERE category = ${category} ORDER BY created_at DESC`
        : await sql`SELECT id, url, category, filename, uploader, created_at FROM photos ORDER BY created_at DESC`;
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const { url, category, filename, uploader } = req.body || {};
    if (!url || !category) {
      return res.status(400).json({ error: "url und category sind erforderlich" });
    }
    const [row] = await sql`
      INSERT INTO photos (url, category, filename, uploader)
      VALUES (${url}, ${category}, ${filename || null}, ${uploader || null})
      RETURNING id, url, category, filename, uploader, created_at
    `;
    return res.status(200).json(row);
  }

  if (req.method === "DELETE") {
    if (!checkAdmin(req)) return res.status(401).json({ error: "Nicht berechtigt" });
    const { id, ids } = req.query;
    if (ids) {
      const idList = String(ids)
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((n) => Number.isInteger(n));
      if (idList.length === 0) {
        return res.status(400).json({ error: "ids ist ungültig" });
      }
      const rows = await sql`SELECT url FROM photos WHERE id = ANY(${idList})`;
      if (rows.length > 0) {
        try {
          await del(rows.map((r) => r.url));
        } catch {
          // Blobs evtl. schon gelöscht/nicht mehr vorhanden — DB-Einträge trotzdem entfernen
        }
      }
      await sql`DELETE FROM photos WHERE id = ANY(${idList})`;
      return res.status(200).json({ ok: true });
    }

    if (!id) {
      return res.status(400).json({ error: "id ist erforderlich" });
    }
    const [row] = await sql`SELECT url FROM photos WHERE id = ${id}`;
    if (row) {
      try {
        await del(row.url);
      } catch {
        // Blob evtl. schon gelöscht/nicht mehr vorhanden — DB-Eintrag trotzdem entfernen
      }
    }
    await sql`DELETE FROM photos WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", ["GET", "POST", "DELETE"]);
  return res.status(405).json({ error: "Method not allowed" });
}
