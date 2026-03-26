import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 w-full"
    >
      <span
        className={[
          'w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors',
          checked ? 'bg-primary border-primary' : 'bg-background-medium border-background-light',
        ].join(' ')}
      >
        {checked && <span className="w-2.5 h-2.5 rounded bg-white" />}
      </span>
      <span className="text-sm text-text-primary">{label}</span>
    </button>
  );
}

export default function PollCreateModal({
  chatId,
  open,
  onClose,
  onCreated,
}: {
  chatId: string;
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isMultiChoice, setIsMultiChoice] = useState(false);
  const [isQuiz, setIsQuiz] = useState(false);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);

  const [mediaMode, setMediaMode] = useState<'none' | 'image' | 'draw'>('none');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaUploading, setMediaUploading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawColor, setDrawColor] = useState('#FF2B5E');
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = useMemo(() => {
    if (!question.trim()) return false;
    const cleaned = options.map((o) => o.trim());
    if (cleaned.length < 2) return false;
    if (cleaned.some((o) => !o)) return false;
    if (isQuiz && (correctOptionIndex < 0 || correctOptionIndex >= cleaned.length)) return false;
    if (mediaMode === 'image' && !mediaUrl) return false;
    return true;
  }, [question, options, isQuiz, correctOptionIndex, mediaMode, mediaUrl]);

  const clearCanvas = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.restore();
  };

  useEffect(() => {
    if (mediaMode !== 'draw') return;
    // Ensure canvas has a dark background.
    clearCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaMode]);

  if (!open) return null;

  const addOption = () => {
    setOptions((prev) => [...prev, '']);
  };

  const updateOption = (idx: number, value: string) => {
    setOptions((prev) => prev.map((v, i) => (i === idx ? value : v)));
    if (isQuiz && idx === correctOptionIndex && !value.trim()) {
      // If quiz correct option becomes empty, keep index; backend will validate texts anyway.
    }
  };

  const handleSubmit = async () => {
    if (!canCreate || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      let uploadedMediaUrl: string | null = mediaUrl;
      if (mediaMode === 'draw') {
        const c = canvasRef.current;
        if (!c) throw new Error('Canvas not found');
        const blob: Blob | null = await new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/png', 0.92));
        if (!blob) throw new Error('Could not export drawing');
        const uploaded = await api.uploadChatMedia(chatId, blob, 'poll-drawing.png');
        uploadedMediaUrl = uploaded.mediaUrl;
      }

      await api.createPoll(chatId, {
        question,
        options: options.map((t) => ({ text: t })),
        isAnonymous,
        isMultiChoice,
        isQuiz,
        correctOptionIndex,
        mediaUrl: uploadedMediaUrl,
        mediaCaption: mediaCaption.trim() ? mediaCaption.trim() : null,
      });
      setQuestion('');
      setOptions(['', '']);
      setIsAnonymous(false);
      setIsMultiChoice(false);
      setIsQuiz(false);
      setCorrectOptionIndex(0);
      setMediaMode('none');
      setMediaUrl(null);
      setMediaCaption('');
      clearCanvas();
      onCreated?.();
      onClose();
    } catch {
      setError('Не удалось создать опрос');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-background-medium border border-background-light shadow-2xl overflow-hidden animate-scale-in">
        <div className="px-4 py-3 border-b border-background-light/70">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-text-primary">Новый опрос</div>
            <button type="button" onClick={onClose} className="p-1.5 hover:bg-background-light rounded-full transition-colors">
              ✕
            </button>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div>
            <div className="text-sm font-medium text-text-secondary mb-2">Вопрос</div>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Можно ли так делать?"
              className="w-full px-3 py-2.5 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary placeholder-text-secondary transition-colors"
            />
          </div>

          <div className="border border-background-light/70 rounded-xl p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-text-secondary">Медиа для опроса</div>
                <div className="text-xs text-text-secondary mt-0.5">Картинка или рисунок (необязательно)</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setMediaMode('none')}
                  className={[
                    'px-2.5 py-1.5 rounded-lg text-sm transition-colors border',
                    mediaMode === 'none' ? 'bg-primary/15 border-primary/50 text-text-primary' : 'bg-background-light/50 border-background-light/50 text-text-secondary hover:text-text-primary',
                  ].join(' ')}
                >
                  Нет
                </button>
                <button
                  type="button"
                  onClick={() => setMediaMode('image')}
                  className={[
                    'px-2.5 py-1.5 rounded-lg text-sm transition-colors border',
                    mediaMode === 'image' ? 'bg-primary/15 border-primary/50 text-text-primary' : 'bg-background-light/50 border-background-light/50 text-text-secondary hover:text-text-primary',
                  ].join(' ')}
                >
                  Картинка
                </button>
                <button
                  type="button"
                  onClick={() => setMediaMode('draw')}
                  className={[
                    'px-2.5 py-1.5 rounded-lg text-sm transition-colors border',
                    mediaMode === 'draw' ? 'bg-primary/15 border-primary/50 text-text-primary' : 'bg-background-light/50 border-background-light/50 text-text-secondary hover:text-text-primary',
                  ].join(' ')}
                >
                  Рисунок
                </button>
              </div>
            </div>

            {mediaMode === 'image' && (
              <div className="mt-3 space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  className="w-full text-text-secondary"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setMediaUploading(true);
                    setError(null);
                    try {
                      const uploaded = await api.uploadChatMedia(chatId, f, f.name);
                      setMediaUrl(uploaded.mediaUrl);
                    } catch {
                      setError('Не удалось загрузить картинку');
                      setMediaUrl(null);
                    } finally {
                      setMediaUploading(false);
                    }
                  }}
                />
                {mediaUrl && (
                  <div className="rounded-xl overflow-hidden border border-background-light/70 bg-background-dark/20">
                    <img src={mediaUrl} alt="" className="w-full max-h-64 object-cover" draggable={false} />
                  </div>
                )}
              </div>
            )}

            {mediaMode === 'draw' && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {['#FF2B5E', '#FFE066', '#FFFFFF', '#7C3AED', '#22C55E'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setDrawColor(c)}
                        className={[
                          'w-7 h-7 rounded-full border transition-colors',
                          drawColor === c ? 'border-white ring-2 ring-white/30' : 'border-background-light',
                        ].join(' ')}
                        style={{ background: c }}
                        aria-label={`Draw color ${c}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => clearCanvas()}
                    className="px-3 py-2 rounded-lg text-text-secondary hover:bg-background-light transition-colors text-sm"
                  >
                    Очистить
                  </button>
                </div>
                <div className="rounded-xl border border-background-light/70 bg-black/80 p-2">
                  <canvas
                    ref={canvasRef}
                    width={320}
                    height={200}
                    className="w-full h-auto rounded-lg touch-none"
                    onPointerDown={(e) => {
                      const c = canvasRef.current;
                      if (!c) return;
                      const ctx = c.getContext('2d');
                      if (!ctx) return;
                      const rect = c.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) * c.width) / rect.width;
                      const y = ((e.clientY - rect.top) * c.height) / rect.height;
                      isDrawingRef.current = true;
                      lastPointRef.current = { x, y };
                      ctx.strokeStyle = drawColor;
                      ctx.lineWidth = 6;
                      ctx.lineCap = 'round';
                      ctx.beginPath();
                      ctx.moveTo(x, y);
                      e.preventDefault();
                    }}
                    onPointerMove={(e) => {
                      if (!isDrawingRef.current) return;
                      const c = canvasRef.current;
                      if (!c) return;
                      const ctx = c.getContext('2d');
                      if (!ctx) return;
                      const rect = c.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) * c.width) / rect.width;
                      const y = ((e.clientY - rect.top) * c.height) / rect.height;
                      ctx.strokeStyle = drawColor;
                      ctx.lineWidth = 6;
                      ctx.lineCap = 'round';
                      const last = lastPointRef.current;
                      ctx.beginPath();
                      ctx.moveTo(last?.x ?? x, last?.y ?? y);
                      ctx.lineTo(x, y);
                      ctx.stroke();
                      lastPointRef.current = { x, y };
                    }}
                    onPointerUp={() => {
                      isDrawingRef.current = false;
                      lastPointRef.current = null;
                    }}
                    onPointerCancel={() => {
                      isDrawingRef.current = false;
                      lastPointRef.current = null;
                    }}
                  />
                </div>
              </div>
            )}

            {(mediaMode === 'image' || mediaMode === 'draw') && (
              <div className="mt-3">
                <div className="text-sm font-medium text-text-secondary mb-2">Подпись</div>
                <input
                  value={mediaCaption}
                  onChange={(e) => setMediaCaption(e.target.value)}
                  placeholder="Например: что изображено на картинке"
                  className="w-full px-3 py-2.5 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary placeholder-text-secondary transition-colors"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-text-secondary">Варианты ответа</div>

            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-3">
                {isQuiz && (
                  <button
                    type="button"
                    onClick={() => setCorrectOptionIndex(idx)}
                    className={[
                      'w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors',
                      correctOptionIndex === idx ? 'bg-primary border-primary' : 'bg-background-medium border-background-light',
                    ].join(' ')}
                    aria-label="Set correct option"
                  >
                    {correctOptionIndex === idx && <span className="w-2.5 h-2.5 rounded bg-white" />}
                  </button>
                )}

                <input
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={idx === 0 ? 'да' : 'нет'}
                  className="flex-1 px-3 py-2 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary placeholder-text-secondary transition-colors"
                />
              </div>
            ))}

            <button
              type="button"
              className="w-full py-2.5 text-text-secondary hover:text-text-primary text-sm transition-colors"
              onClick={addOption}
              disabled={options.length >= 12}
            >
              Можно добавить ещё 10 вариантов ответа
            </button>
          </div>

          <div className="border-t border-background-light/70 pt-4 space-y-3">
            <div className="text-sm font-medium text-text-secondary">Настройки</div>
            <div className="space-y-2">
              <Checkbox checked={isAnonymous} onChange={setIsAnonymous} label="Анонимное голосование" />
              <Checkbox checked={isMultiChoice} onChange={setIsMultiChoice} label="Выбор нескольких ответов" />
              <Checkbox checked={isQuiz} onChange={(v) => { setIsQuiz(v); if (!v) setCorrectOptionIndex(0); }} label="Режим викторины" />
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-background-light/70 flex items-center justify-between gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-text-secondary hover:bg-background-light transition-colors">
            Отмена
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canCreate || submitting || mediaUploading}
            className="px-4 py-2 rounded-lg bg-primary text-white hover:opacity-95 transition-opacity disabled:opacity-50"
          >
            Создать
          </button>
        </div>

        {error && (
          <div className="px-4 pb-4">
            <div className="text-status-danger text-sm text-center">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}

