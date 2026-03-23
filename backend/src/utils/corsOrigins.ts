/**
 * CORS / Socket.io allowed origins. Set CORS_ORIGINS=comma-separated list,
 * or FRONTEND_URL (single), plus 127.0.0.1 for local Docker access.
 */
export function resolveCorsOrigins(): string | string[] {
  const fromList = process.env.CORS_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromList?.length) {
    return fromList.length === 1 ? fromList[0] : fromList;
  }
  const primary = process.env.FRONTEND_URL?.trim() || 'http://localhost:5173';
  const set = new Set([
    primary,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5175',
    'http://localhost:5176',
    'http://127.0.0.1:5176',
  ]);
  return Array.from(set);
}
