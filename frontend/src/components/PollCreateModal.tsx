import { useMemo, useState } from 'react';
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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = useMemo(() => {
    if (!question.trim()) return false;
    const cleaned = options.map((o) => o.trim());
    if (cleaned.length < 2) return false;
    if (cleaned.some((o) => !o)) return false;
    if (isQuiz && (correctOptionIndex < 0 || correctOptionIndex >= cleaned.length)) return false;
    return true;
  }, [question, options, isQuiz, correctOptionIndex]);

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
      await api.createPoll(chatId, {
        question,
        options: options.map((t) => ({ text: t })),
        isAnonymous,
        isMultiChoice,
        isQuiz,
        correctOptionIndex,
      });
      setQuestion('');
      setOptions(['', '']);
      setIsAnonymous(false);
      setIsMultiChoice(false);
      setIsQuiz(false);
      setCorrectOptionIndex(0);
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
            disabled={!canCreate || submitting}
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

