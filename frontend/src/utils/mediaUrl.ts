/**
 * Resolves `/uploads/...` to a loadable URL.
 * If VITE_API_URL is set (e.g. http://localhost:3001), media is loaded from the API host
 * (fixes 404 when the dev server runs on a port without a working proxy).
 */
export function mediaUrl(path: string | null | undefined): string | undefined {
  if (path == null || path === '') return undefined;
  if (path.startsWith('data:')) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // Same host as API/WebSocket (Netlify UI often sets both; fallback avoids broken /uploads on netlify.app)
  const base = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_WS_URL ||
    ''
  ).replace(/\/$/, '');
  const normalizedBase = base
    .replace(/^ws:\/\//i, 'http://')
    .replace(/^wss:\/\//i, 'https://');
  const p = path.startsWith('/') ? path : `/${path}`;
  if (normalizedBase) return `${normalizedBase}${p}`;
  return p;
}
