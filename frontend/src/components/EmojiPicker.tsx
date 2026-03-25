import { useEffect, useRef } from 'react';
import { parse } from '@twemoji/parser';

const emojiUrlCache = new Map<string, string>();

function getTwemojiUrl(emoji: string): string | null {
  const cached = emojiUrlCache.get(emoji);
  if (cached) return cached;

  // @twemoji/parser returns entities with `url` pointing to SVG on CDN.
  const entities = parse(emoji);
  const url = entities?.[0]?.url ?? null;
  if (url) emojiUrlCache.set(emoji, url);
  return url;
}

const EMOJI_GROUPS: { label: string; chars: string[] }[] = [
  {
    label: 'Смайлы',
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
    ],
  },
  {
    label: 'Жесты',
    chars: ['👍', '👎', '👌', '🤌', '✌️', '🤞', '🤝', '🙏', '👏', '🙌', '👋', '💪', '🤷', '🤦'],
  },
  {
    label: 'Сердца',
    chars: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '❣️', '💕', '💞', '💓', '💗'],
  },
  {
    label: 'Разное',
    chars: ['🔥', '✨', '⭐', '🎉', '💯', '✅', '❌', '⚠️', '📌', '💬', '👀', '🤖', '💡'],
  },
  {
    label: 'Капельки (trublebubble)',
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

  useEffect(() => {
    if (!open) return;
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

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full right-0 mb-2 w-[min(100vw-2rem,320px)] max-h-[min(50vh,280px)] overflow-y-auto rounded-xl border border-background-light bg-background-medium shadow-2xl z-[80] p-2 animate-scale-in"
      role="listbox"
      aria-label="Эмодзи"
    >
      {EMOJI_GROUPS.map((g) => (
        <div key={g.label} className="mb-2 last:mb-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary px-1 mb-1">
            {g.label}
          </p>
          <div className="flex flex-wrap gap-0.5">
            {g.chars.map((ch) => (
              <button
                key={ch}
                type="button"
                className="w-9 h-9 text-xl rounded-lg hover:bg-background-light flex items-center justify-center transition-colors"
                onClick={() => {
                  onPick(ch);
                  onClose();
                }}
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
