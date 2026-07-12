import { list } from "@vercel/blob";

// Ermittelt die tatsächlich belegte Speichergröße direkt bei Vercel Blob
// (nicht aus der DB), damit die Zahl auch verwaiste Blobs mitzählt und exakt
// dem entspricht, was gegen das Speicherlimit des Vercel-Plans zählt.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    let totalBytes = 0;
    let count = 0;
    let cursor;
    do {
      const page = await list({ cursor, limit: 1000 });
      for (const blob of page.blobs) {
        totalBytes += blob.size;
        count += 1;
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    return res.status(200).json({ totalBytes, count });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
