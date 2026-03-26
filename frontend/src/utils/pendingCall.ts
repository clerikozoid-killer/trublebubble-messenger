export type PendingCallPayload = {
  chatId: string;
  callId: string;
  offer: RTCSessionDescriptionInit;
  callType: 'audio' | 'video';
  fromUserId?: string;
};

const KEY_PREFIX = 'truble-pending-call:';
const AUTO_ACCEPT_PREFIX = 'truble-auto-accept:';

export function savePendingCall(p: PendingCallPayload) {
  try {
    localStorage.setItem(`${KEY_PREFIX}${p.chatId}`, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export function loadPendingCall(chatId: string): PendingCallPayload | null {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${chatId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingCallPayload;
    if (!parsed?.chatId || !parsed?.callId || !parsed?.offer || !parsed?.callType) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingCall(chatId: string) {
  try {
    localStorage.removeItem(`${KEY_PREFIX}${chatId}`);
  } catch {
    // ignore
  }
}

export function setAutoAcceptCall(chatId: string, callId: string) {
  try {
    localStorage.setItem(`${AUTO_ACCEPT_PREFIX}${chatId}:${callId}`, '1');
  } catch {
    // ignore
  }
}

export function setAutoAcceptCallMode(
  chatId: string,
  callId: string,
  mode: 'audio' | 'video'
) {
  try {
    // store preferred mode
    localStorage.setItem(`${AUTO_ACCEPT_PREFIX}${chatId}:${callId}`, mode);
  } catch {
    // ignore
  }
}

export function consumeAutoAcceptCall(
  chatId: string,
  callId: string
): 'audio' | 'video' | null {
  try {
    const key = `${AUTO_ACCEPT_PREFIX}${chatId}:${callId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    localStorage.removeItem(key);
    // Backward compatibility: older values could be '1'
    if (raw === '1') return null;
    if (raw === 'audio' || raw === 'video') return raw;
    return null;
  } catch {
    return null;
  }
}

