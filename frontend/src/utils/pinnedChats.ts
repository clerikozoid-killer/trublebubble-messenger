const KEY = 'truble-bubble-pinned-chats';

export function getPinnedChatIds(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr as string[]).filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function setPinnedChatIds(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids));
}

export function togglePinnedChat(chatId: string): boolean {
  const cur = getPinnedChatIds();
  const next = cur.includes(chatId) ? cur.filter((id) => id !== chatId) : [...cur, chatId];
  setPinnedChatIds(next);
  return next.includes(chatId);
}

export function isChatPinned(chatId: string): boolean {
  return getPinnedChatIds().includes(chatId);
}
