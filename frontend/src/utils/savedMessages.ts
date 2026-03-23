const KEY = 'truble-saved-messages-v1';

export type SavedMessageSnapshot = {
  id: string;
  chatId: string;
  chatTitle?: string;
  senderName: string;
  content?: string;
  mediaUrl?: string;
  contentType?: string;
  createdAt: string;
  savedAt: string;
};

export function getSavedMessages(): SavedMessageSnapshot[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr as SavedMessageSnapshot[]) : [];
  } catch {
    return [];
  }
}

export function addSavedMessage(snapshot: Omit<SavedMessageSnapshot, 'savedAt'>): void {
  const cur = getSavedMessages();
  const next: SavedMessageSnapshot = {
    ...snapshot,
    savedAt: new Date().toISOString(),
  };
  const dedup = cur.filter((x) => x.id !== snapshot.id);
  dedup.unshift(next);
  localStorage.setItem(KEY, JSON.stringify(dedup.slice(0, 500)));
}

export function removeSavedMessage(messageId: string): void {
  const cur = getSavedMessages().filter((x) => x.id !== messageId);
  localStorage.setItem(KEY, JSON.stringify(cur));
}
