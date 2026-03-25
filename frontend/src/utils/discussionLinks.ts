export type DiscussionLink = {
  discussionChatId: string;
  parentChatId: string;
  messageId: string;
};

const KEY = 'truble-bubble-discussion-links';
const REV_KEY = 'truble-bubble-discussion-links-rev';

function storageKey(userId: string) {
  return `${KEY}:${userId}`;
}

type LinkMap = Record<string, DiscussionLink>;

function readAll(userId: string): LinkMap {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    return JSON.parse(raw) as LinkMap;
  } catch {
    return {};
  }
}

function writeAll(userId: string, map: LinkMap) {
  localStorage.setItem(storageKey(userId), JSON.stringify(map));
}

function mapKey(parentChatId: string, messageId: string) {
  return `${parentChatId}:${messageId}`;
}

type RevLinkMap = Record<string, { parentChatId: string; parentMessageId: string }>;

function storageKeyRev(userId: string) {
  return `${REV_KEY}:${userId}`;
}

function readAllRev(userId: string): RevLinkMap {
  try {
    const raw = localStorage.getItem(storageKeyRev(userId));
    if (!raw) return {};
    return JSON.parse(raw) as RevLinkMap;
  } catch {
    return {};
  }
}

function writeAllRev(userId: string, map: RevLinkMap) {
  localStorage.setItem(storageKeyRev(userId), JSON.stringify(map));
}

export function getDiscussionLink(
  userId: string,
  parentChatId: string,
  messageId: string
): DiscussionLink | null {
  const map = readAll(userId);
  return map[mapKey(parentChatId, messageId)] ?? null;
}

export function setDiscussionLink(
  userId: string,
  parentChatId: string,
  messageId: string,
  discussionChatId: string
) {
  const map = readAll(userId);
  map[mapKey(parentChatId, messageId)] = { parentChatId, messageId, discussionChatId };
  writeAll(userId, map);

  const rev = readAllRev(userId);
  rev[discussionChatId] = { parentChatId, parentMessageId: messageId };
  writeAllRev(userId, rev);
}

export function getParentDiscussionLink(
  userId: string,
  discussionChatId: string
): { parentChatId: string; parentMessageId: string } | null {
  const rev = readAllRev(userId);
  return rev[discussionChatId] ?? null;
}

