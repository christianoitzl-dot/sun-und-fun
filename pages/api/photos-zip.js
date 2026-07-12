import { Readable } from "stream";
import archiver from "archiver";
import { getDb } from "../../lib/db";

// Erlaubt größere Antworten (keine 4-MB-Warnung von Next.js) und mehr Zeit
// für viele/große Fotos beim Zippen.
export const config = { api: { responseLimit: false } };
export const maxDuration = 60;

// Baut ein ZIP aller Fotos (optional gefiltert nach Kategorie) und streamt es
// direkt an den Browser, ohne alle Dateien komplett im Speicher zu halten.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sql = getDb();
  const { category, ids } = req.query;

  let rows;
  let zipName;
  if (ids) {
    const idList = String(ids)
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isInteger(n));
    if (idList.length === 0) {
      return res.status(400).json({ error: "ids ist ungültig" });
    }
    rows = await sql`SELECT id, url, category, filename FROM photos WHERE id = ANY(${idList}) ORDER BY created_at ASC`;
    zipName = "fotos-auswahl.zip";
  } else {
    rows =
      category && category !== "alle"
        ? await sql`SELECT id, url, category, filename FROM photos WHERE category = ${category} ORDER BY created_at ASC`
        : await sql`SELECT id, url, category, filename FROM photos ORDER BY created_at ASC`;
    zipName = `fotos-${category && category !== "alle" ? category : "alle"}.zip`;
  }

  if (rows.length === 0) {
    return res.status(404).json({ error: "Keine Fotos vorhanden" });
  }
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("warning", () => {});
  archive.on("error", (err) => {
    // Ist die Übertragung schon gestartet, können wir keinen JSON-Fehler mehr senden.
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.end();
    }
  });
  archive.pipe(res);

  const usedNames = new Set();
  for (const row of rows) {
    try {
      const r = await fetch(row.url);
      if (!r.ok || !r.body) continue;
      let name = `${row.category}/${row.filename || `foto-${row.id}.jpg`}`;
      if (usedNames.has(name)) {
        name = `${row.category}/${row.id}-${row.filename || "foto.jpg"}`;
      }
      usedNames.add(name);
      archive.append(Readable.fromWeb(r.body), { name });
    } catch {
      // Einzelnes Foto nicht erreichbar — überspringen, Rest weiter zippen.
    }
  }

  await archive.finalize();
}
