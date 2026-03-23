/**
 * Resolves `/uploads/...` to a loadable URL.
 * If VITE_API_URL is set (e.g. http://localhost:3001), media is loaded from the API host
 * (fixes 404 when the dev server runs on a port without a working proxy).
 */
export function mediaUrl(path: string | null | undefined): string | undefined {
  if (path == null || path === '') return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  if (base) return `${base}${p}`;
  return p;
}
