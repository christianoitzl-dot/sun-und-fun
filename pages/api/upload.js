import { handleUpload } from "@vercel/blob/client";

// Diese Route gibt selbst keine Dateien entgegen — sie erteilt dem Browser
// nur die Erlaubnis, direkt (Client Upload) zu Vercel Blob hochzuladen.
// Dadurch umgehen wir das 4,5-MB-Limit von Vercel Serverless Functions.
export default async function handler(req, res) {
  const body = req.body;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/heic",
            "image/heif",
            "image/gif",
          ],
          addRandomSuffix: true,
          // Fotos vom Fest sind kein besonders sensibler Inhalt —
          // 1 Tag Gültigkeit für den Upload-Token reicht.
          maximumSizeInBytes: 50 * 1024 * 1024, // 50 MB pro Foto als Sicherheitsnetz
        };
      },
      onUploadCompleted: async () => {
        // Bewusst leer: Die Metadaten (URL/Kategorie/Dateiname) werden vom
        // Frontend direkt nach dem Upload per POST an /api/photos gespeichert.
        // Das funktioniert zuverlässig auch lokal, wo dieser Webhook (der nur
        // eine öffentlich erreichbare URL erlaubt) nicht ausgelöst wird.
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}
