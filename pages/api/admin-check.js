import { checkAdmin } from "../../lib/adminAuth";

// Prüft das Admin-Passwort für den Login im Admin-Bereich.
// Der Client schickt es als Header "x-admin-key"; Antwort 200 oder 401.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!checkAdmin(req)) {
    return res.status(401).json({ error: "Falsches Passwort" });
  }
  return res.status(200).json({ ok: true });
}
