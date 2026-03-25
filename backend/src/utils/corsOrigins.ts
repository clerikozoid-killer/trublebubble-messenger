/**
 * CORS / Socket.io allowed origins. Set CORS_ORIGINS=comma-separated list,
 * or FRONTEND_URL (single), plus 127.0.0.1 for local Docker access.
 *
 * CORS_ALLOW_TRY_CLOUDFLARE=true — разрешить https://*.trycloudflare.com (Cloudflare quick tunnel).
 * CORS_ALLOW_NGROK=true — разрешить https://*.ngrok-free.app / https://*.ngrok.app.
 * CORS_ALLOW_LOCALTUNNEL=true — разрешить https://*.loca.lt / https://*.localtunnel.me.
 */
function buildStaticOriginList(): string[] {
  const fromList = process.env.CORS_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromList?.length) {
    return fromList;
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

function isTryCloudflareOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return u.protocol === 'https:' && u.hostname.endsWith('.trycloudflare.com');
  } catch {
    return false;
  }
}

function isNgrokOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return (
      u.protocol === 'https:' &&
      (u.hostname.endsWith('.ngrok-free.app') || u.hostname.endsWith('.ngrok.app'))
    );
  } catch {
    return false;
  }
}

function isLocaltunnelOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return (
      u.protocol === 'https:' &&
      (u.hostname.endsWith('.loca.lt') || u.hostname.endsWith('.localtunnel.me'))
    );
  } catch {
    return false;
  }
}

type CorsOriginOption =
  | string
  | string[]
  | ((
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => void);

export function resolveCorsOrigin(): CorsOriginOption {
  const allowTryCloudflare =
    process.env.CORS_ALLOW_TRY_CLOUDFLARE === '1' ||
    process.env.CORS_ALLOW_TRY_CLOUDFLARE === 'true';
  const allowNgrok =
    process.env.CORS_ALLOW_NGROK === '1' || process.env.CORS_ALLOW_NGROK === 'true';
  const allowLocaltunnel =
    process.env.CORS_ALLOW_LOCALTUNNEL === '1' ||
    process.env.CORS_ALLOW_LOCALTUNNEL === 'true';
  const staticList = buildStaticOriginList();

  if (allowTryCloudflare || allowNgrok || allowLocaltunnel) {
    return (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowTryCloudflare && isTryCloudflareOrigin(origin)) {
        callback(null, true);
        return;
      }
      if (allowNgrok && isNgrokOrigin(origin)) {
        callback(null, true);
        return;
      }
      if (allowLocaltunnel && isLocaltunnelOrigin(origin)) {
        callback(null, true);
        return;
      }
      if (staticList.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    };
  }

  return staticList.length === 1 ? staticList[0] : staticList;
}
