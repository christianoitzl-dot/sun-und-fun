// Server-seitige Prüfung des Admin-Passworts. Das Passwort steht damit nicht
// mehr im Client-Bundle; der Browser schickt es als Header "x-admin-key" mit.
// Über die Umgebungsvariable ADMIN_PW (z.B. im Vercel-Dashboard) lässt es sich
// ändern, ohne Code anzufassen; ohne Env-Variable gilt der bisherige Wert.
export function checkAdmin(req) {
  const expected = process.env.ADMIN_PW || "3246";
  return req.headers["x-admin-key"] === expected;
}
