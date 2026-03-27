import { useEffect, useMemo, useRef, useState } from 'react';
import { parse } from '@twemoji/parser';
import { useI18n } from '../i18n/useI18n';

const emojiUrlCache = new Map<string, string>();
const RECENT_KEY = 'truble-bubble-recent-emojis';
const RECENT_MAX = 24;

// Minimal keyword map (Telegram-like). Can be extended.
const EMOJI_KEYWORDS: Record<string, string[]> = {
  '😀': ['smile', 'улыб', 'радост', 'смайл'],
  '😂': ['lol', 'аха', 'смех', 'смеш', 'laug', 'cry'],
  '😍': ['love', 'люб', 'серд', 'влюб'],
  '❤️': ['love', 'heart', 'серд', 'люб'],
  '🔥': ['fire', 'огонь', 'жар', 'hot'],
  '👍': ['ok', 'да', 'лайк', 'like', 'thumb'],
  '👎': ['нет', 'dislike', 'thumb'],
  '🙏': ['pray', 'пожал', 'спасиб', 'thanks'],
  '💯': ['100', 'сто', 'класс'],
  '🎉': ['party', 'празд', 'ура', 'celebrate'],
  '🤖': ['bot', 'робот'],
  '🩸': ['blood', 'кров', 'truble', 'bubble', 'капл'],
  '💧': ['drop', 'капл', 'вода'],
};

function getTwemojiUrl(emoji: string): string | null {
  const cached = emojiUrlCache.get(emoji);
  if (cached) return cached;

  // @twemoji/parser returns entities with `url` pointing to SVG on CDN.
  try {
    const entities = parse(emoji);
    const url = entities?.[0]?.url ?? null;
    if (url) emojiUrlCache.set(emoji, url);
    return url;
  } catch {
    // If parsing fails for a specific emoji, fallback to rendering the raw char.
    return null;
  }
}

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => typeof x === 'string').slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch {
    // ignore
  }
}

function pushRecent(emoji: string) {
  const cur = readRecent();
  const next = [emoji, ...cur.filter((e) => e !== emoji)];
  writeRecent(next);
}

function emojiMatchesQuery(emoji: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  // direct match (user pasted emoji)
  if (emoji.includes(q)) return true;
  const kws = EMOJI_KEYWORDS[emoji];
  if (!kws?.length) return false;
  return kws.some((k) => k.includes(q));
}

const EMOJI_GROUPS: { labelKey: string; chars: string[] }[] = [
  {
    labelKey: 'emoji.group.smiles',
    chars: [
      '😀',
      '😃',
      '😄',
      '😁',
      '😅',
      '😂',
      '🤣',
      '😊',
      '😇',
      '🙂',
      '😉',
      '😌',
      '😍',
      '🥰',
      '😘',
      '😗',
      '😋',
      '😛',
      '😜',
      '🤪',
      '😏',
      '😒',
      '😞',
      '😔',
      '😟',
      '😢',
      '😭',
      '😤',
      '😠',
      '😡',
      '🤔',
      '😶',
      '😐',
      '🙄',
      '😬',
      '😳',
      '🥺',
      '😱',
      '🤩',
      '🥳',
      '😎',
      '🫠',
      '🫡',
      '🤗',
      '🤯',
      '😴',
      '🤤',
      '🤠',
      '🤓',
      '😈',
      '👻',
      '💀',
    ],
  },
  {
    labelKey: 'emoji.group.gestures',
    chars: ['👍', '👎', '👌', '🤌', '✌️', '🤞', '🤝', '🙏', '👏', '🙌', '👋', '💪', '🤷', '🤦', '🫶', '🫰', '🖐️', '✋', '🤟', '☝️'],
  },
  {
    labelKey: 'emoji.group.hearts',
    chars: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  },
  {
    labelKey: 'emoji.group.misc',
    chars: ['🔥', '✨', '⭐', '🌟', '🎉', '🎊', '💯', '✅', '❌', '⚠️', '📌', '💬', '👀', '🤖', '💡', '🎵', '🎶', '🎮', '🏆', '🚀'],
  },
  {
    labelKey: 'emoji.group.animals',
    chars: ['🐶', '🐱', '🦊', '🐼', '🐻', '🦁', '🐯', '🐸', '🐵', '🐧', '🐤', '🦄', '🐙', '🐬', '🦋'],
  },
  {
    labelKey: 'emoji.group.food',
    chars: ['🍏', '🍓', '🍒', '🍉', '🍕', '🍔', '🌮', '🍜', '🍣', '🍪', '🍩', '🍫', '☕', '🍵', '🥤'],
  },
  {
    labelKey: 'emoji.group.flags',
    chars: ['🇺🇦', '🇷🇺', '🇺🇸', '🇬🇧', '🇩🇪', '🇫🇷', '🇮🇹', '🇪🇸', '🇵🇱', '🇯🇵', '🇰🇷', '🇨🇳'],
  },
  {
    labelKey: 'emoji.group.drops',
    // Набор «красных капелек» (базовые кровяные/красные капли + символы).
    chars: ['🩸', '🩹', '🩺', '🩻', '🩼', '💧', '🔴', '🟥', '❤️', '💗'],
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (emoji: string) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
};

export default function EmojiPicker({ open, onClose, onPick, anchorRef }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setRecent(readRecent());
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const groups = useMemo(() => {
    const q = query.trim();
    const base = EMOJI_GROUPS.map((g) => ({
      labelKey: g.labelKey,
      label: t(g.labelKey as any),
      chars: q ? g.chars.filter((e) => emojiMatchesQuery(e, q)) : g.chars,
    })).filter((g) => g.chars.length > 0);

    if (!q && recent.length > 0) {
      return [{ labelKey: 'emoji.recent', label: t('emoji.recent'), chars: recent }, ...base];
    }
    return base;
  }, [query, recent, t]);

  const pick = (ch: string) => {
    pushRecent(ch);
    setRecent(readRecent());
    onPick(ch);
    onClose();
  };

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full right-0 mb-2 w-[min(100vw-2rem,320px)] max-h-[min(55vh,320px)] overflow-y-auto rounded-xl border border-background-light bg-background-medium shadow-2xl z-[300] p-2 animate-scale-in"
      role="listbox"
      aria-label={t('emoji.title')}
    >
      <div className="sticky top-0 bg-background-medium pb-2 z-10">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('emoji.searchPlaceholder')}
          className="w-full px-3 py-2 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary placeholder-text-secondary transition-colors text-sm"
        />
      </div>

      {groups.map((g) => (
        <div key={g.labelKey} className="mb-2 last:mb-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary px-1 mb-1">
            {g.label}
          </p>
          <div className="flex flex-wrap gap-0.5">
            {g.chars.map((ch) => (
              <button
                key={ch}
                type="button"
                className="w-9 h-9 text-xl rounded-lg hover:bg-background-light flex items-center justify-center transition-colors"
                onClick={() => pick(ch)}
              >
                {/* Render as Twemoji SVG for consistent quality across devices. */}
                {(() => {
                  const url = getTwemojiUrl(ch);
                  return url ? (
                    <img
                      src={url}
                      alt=""
                      className="w-6 h-6 object-contain pointer-events-none select-none"
                      draggable={false}
                      style={{ filter: 'drop-shadow(0 0 2px rgba(255, 43, 94, 0.35))' }}
                    />
                  ) : (
                    ch
                  );
                })()}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
