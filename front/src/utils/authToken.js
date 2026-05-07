/**
 * JWT from /auth/login or legacy app_sessions UUID bearer.
 * Rejects empty, JSON garbage, and the literal strings "undefined" / "null".
 */
export function looksUsableBearerToken(raw) {
  const t = String(raw || '').trim();
  if (!t || t === 'undefined' || t === 'null') return false;
  if (t.split('.').length === 3) return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t);
}
