import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { socket } from '../services/socket';
import { mediaUrl } from '../utils/mediaUrl';

type PollSummary = {
  pollId: string;
  chatId: string;
  question: string;
  isAnonymous: boolean;
  isMultiChoice: boolean;
  isQuiz: boolean;
  correctOptionId: string | null;
  myOptionIds: string[];
  mediaUrl: string | null;
  mediaCaption: string | null;
  options: Array<{
    id: string;
    text: string;
    order: number;
    voteCount: number;
  }>;
};

function formatVoteCount(n: number): string {
  // Keep it simple; can be localized later.
  if (n === 0) return '0';
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
}

export default function PollCard({
  chatId,
  pollId,
  compact = false,
}: {
  chatId: string;
  pollId: string;
  compact?: boolean;
}) {
  const [summary, setSummary] = useState<PollSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const s = await api.getPollSummary(pollId);
      setSummary(s);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const onUpdated = (p: { pollId: string; chatId: string }) => {
      if (p.pollId !== pollId) return;
      if (p.chatId !== chatId) return;
      void load();
    };

    socket.on('poll_updated', onUpdated);
    return () => {
      socket.off('poll_updated', onUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollId, chatId]);

  const myOptionSet = useMemo(() => new Set(summary?.myOptionIds ?? []), [summary?.myOptionIds]);

  const handleVote = async (optionId: string) => {
    if (!summary) return;
    await api.votePoll(summary.pollId, optionId);
    // summary refreshes via socket event
  };

  if (loading || !summary) {
    return (
      <div className={compact ? 'py-2' : 'py-3'}>
        <div className="text-xs text-text-secondary">Loading poll…</div>
      </div>
    );
  }

  return (
    <div
      className={[
        compact ? 'space-y-2' : 'space-y-3',
        'rounded-xl border border-background-medium/70 bg-background-dark/15 p-2.5',
      ].join(' ')}
    >
      {summary.mediaUrl && (
        <div className="rounded-xl overflow-hidden border border-background-medium/60 bg-background-dark/10">
          <img
            src={mediaUrl(summary.mediaUrl) ?? ''}
            alt=""
            className="w-full max-h-56 object-cover"
            draggable={false}
          />
          {summary.mediaCaption && (
            <div className="px-3 py-2 text-xs text-text-secondary bg-background-dark/10">
              {summary.mediaCaption}
            </div>
          )}
        </div>
      )}

      <div className="text-sm font-semibold text-text-primary">{summary.question}</div>

      <div className="space-y-2">
        {summary.options
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((opt) => {
            const selected = myOptionSet.has(opt.id);
            const hasVoted = summary.myOptionIds.length > 0;
            // In quiz mode the correct answer must be revealed only after the user has voted.
            const showCorrect = summary.isQuiz && hasVoted;
            const isCorrect = showCorrect && summary.correctOptionId === opt.id;
            const count = formatVoteCount(opt.voteCount);

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => void handleVote(opt.id)}
                className={[
                  'w-full text-left px-3 py-2 rounded-lg border transition-colors',
                  selected ? 'border-primary/60 bg-primary/15' : 'border-background-light/40 bg-background-dark/15',
                  isCorrect ? 'ring-2 ring-[#FF2B5E]/35 border-[#FF2B5E]/45' : '',
                ].join(' ')}
                aria-label={`Vote: ${opt.text}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-text-primary truncate">{opt.text}</div>
                    {summary.isQuiz && isCorrect && (
                      <div className="mt-1 text-xs text-[#FF2B5E]">Правильный ответ</div>
                    )}
                  </div>
                  <div className="shrink-0 text-xs tabular-nums text-text-secondary">
                    {count}
                  </div>
                </div>
              </button>
            );
          })}
      </div>

      {summary.isMultiChoice ? (
        <div className="text-[11px] text-[#0b0b0b] bg-background-light/40 rounded px-2 py-1 inline-block">
          Можно выбрать несколько вариантов
        </div>
      ) : (
        <div className="text-[11px] text-text-secondary">Выбор один</div>
      )}
    </div>
  );
}

