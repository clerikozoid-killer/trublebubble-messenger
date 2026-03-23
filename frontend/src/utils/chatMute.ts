const KEY = 'truble-bubble-chat-mute';

type MuteMap = Record<string, string>; // chatId -> ISO end date | 'forever'

function read(): MuteMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MuteMap) : {};
  } catch {
    return {};
  }
}

function write(map: MuteMap) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function isChatMuted(chatId: string): boolean {
  const map = read();
  const v = map[chatId];
  if (!v) return false;
  if (v === 'forever') return true;
  const until = new Date(v).getTime();
  if (Number.isNaN(until)) {
    delete map[chatId];
    write(map);
    return false;
  }
  if (until <= Date.now()) {
    delete map[chatId];
    write(map);
    return false;
  }
  return true;
}

export function setChatMute(
  chatId: string,
  mode: 'off' | '1h' | '8h' | '1w' | 'forever'
) {
  const map = read();
  if (mode === 'off') {
    delete map[chatId];
    write(map);
    return;
  }
  if (mode === 'forever') {
    map[chatId] = 'forever';
    write(map);
    return;
  }
  const ms =
    mode === '1h'
      ? 3600000
      : mode === '8h'
        ? 8 * 3600000
        : 7 * 24 * 3600000;
  map[chatId] = new Date(Date.now() + ms).toISOString();
  write(map);
}

export function muteLabel(chatId: string): string | null {
  const map = read();
  const v = map[chatId];
  if (!v) return null;
  if (v === 'forever') return 'Forever';
  const until = new Date(v).getTime();
  if (Number.isNaN(until) || until <= Date.now()) return null;
  return new Date(until).toLocaleString();
}
