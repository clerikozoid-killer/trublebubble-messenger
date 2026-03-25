const KEY = 'truble-bubble-message-reactions';

function storageKey(userId: string) {
  return `${KEY}:${userId}`;
}

type ReactionMap = Record<string, string>; // messageId -> emoji

function readAll(userId: string): ReactionMap {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    return JSON.parse(raw) as ReactionMap;
  } catch {
    return {};
  }
}

function writeAll(userId: string, map: ReactionMap) {
  localStorage.setItem(storageKey(userId), JSON.stringify(map));
}

export function getReaction(userId: string, messageId: string): string | null {
  const map = readAll(userId);
  return map[messageId] ?? null;
}

export function setReaction(userId: string, messageId: string, emoji: string): void {
  const map = readAll(userId);
  map[messageId] = emoji;
  writeAll(userId, map);
}

export function clearReaction(userId: string, messageId: string): void {
  const map = readAll(userId);
  delete map[messageId];
  writeAll(userId, map);
}

