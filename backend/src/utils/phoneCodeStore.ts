/**
 * In-memory SMS demo codes + rate limiting (ТЗ: 3 send-code per phone / 10 min).
 * For production, replace with Redis.
 */

type Entry = {
  code: string;
  expiresAt: number;
  sendCountWindowStart: number;
  sendCountInWindow: number;
};

const WINDOW_MS = 10 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 3;
const CODE_TTL_MS = 10 * 60 * 1000;

const store = new Map<string, Entry>();

function normalizePhone(phone: string): string {
  return String(phone).trim();
}

export function canSendCode(phone: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const key = normalizePhone(phone);
  const now = Date.now();
  let e = store.get(key);
  if (!e) {
    return { ok: true };
  }
  if (now - e.sendCountWindowStart >= WINDOW_MS) {
    e.sendCountWindowStart = now;
    e.sendCountInWindow = 0;
    return { ok: true };
  }
  if (e.sendCountInWindow >= MAX_SENDS_PER_WINDOW) {
    const retryAfterSec = Math.ceil((e.sendCountWindowStart + WINDOW_MS - now) / 1000);
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  return { ok: true };
}

export function recordSend(phone: string, code: string): void {
  const key = normalizePhone(phone);
  const now = Date.now();
  let e = store.get(key);
  if (!e || now - e.sendCountWindowStart >= WINDOW_MS) {
    e = {
      code,
      expiresAt: now + CODE_TTL_MS,
      sendCountWindowStart: now,
      sendCountInWindow: 0,
    };
  }
  e.code = code;
  e.expiresAt = now + CODE_TTL_MS;
  e.sendCountInWindow += 1;
  store.set(key, e);
}

export function verifyStoredCode(phone: string, code: string): boolean {
  const key = normalizePhone(phone);
  const e = store.get(key);
  if (!e) return false;
  if (Date.now() > e.expiresAt) {
    store.delete(key);
    return false;
  }
  if (e.code !== String(code).trim()) {
    return false;
  }
  store.delete(key);
  return true;
}
