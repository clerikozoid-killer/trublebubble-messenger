import type { Message } from '../types';

export type PinnedMessage = {
  messageId: string;
  chatId: string;
  senderDisplayName: string;
  contentType: Message['contentType'];
  content?: string | null;
  mediaUrl?: string | null;
  createdAt: string;
};

const KEY = 'truble-bubble-pinned-messages';

function storageKey(userId: string) {
  return `${KEY}:${userId}`;
}

function readAll(userId: string): Record<string, PinnedMessage> {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, PinnedMessage>;
  } catch {
    return {};
  }
}

function writeAll(userId: string, map: Record<string, PinnedMessage>) {
  localStorage.setItem(storageKey(userId), JSON.stringify(map));
}

export function getPinnedMessage(userId: string, chatId: string): PinnedMessage | null {
  const map = readAll(userId);
  return map[chatId] ?? null;
}

export function isPinned(userId: string, chatId: string, messageId: string): boolean {
  const p = getPinnedMessage(userId, chatId);
  return Boolean(p && p.messageId === messageId);
}

export function setPinnedMessage(userId: string, pinned: PinnedMessage): void {
  const map = readAll(userId);
  map[pinned.chatId] = pinned;
  writeAll(userId, map);
}

export function clearPinnedMessage(userId: string, chatId: string): void {
  const map = readAll(userId);
  delete map[chatId];
  writeAll(userId, map);
}

export function togglePinnedMessage(userId: string, message: Message): boolean {
  const chatId = message.chatId;
  const cur = getPinnedMessage(userId, chatId);
  if (cur?.messageId === message.id) {
    clearPinnedMessage(userId, chatId);
    return false;
  }
  const pinned: PinnedMessage = {
    messageId: message.id,
    chatId,
    senderDisplayName: message.sender.displayName,
    contentType: message.contentType,
    content: message.content ?? null,
    mediaUrl: message.mediaUrl ?? null,
    createdAt: message.createdAt,
  };
  setPinnedMessage(userId, pinned);
  return true;
}

