import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getSavedMessages, removeSavedMessage, type SavedMessageSnapshot } from '../utils/savedMessages';
import { mediaUrl } from '../utils/mediaUrl';
import { useI18n } from '../i18n/useI18n';

export default function SavedMessages() {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const [items, setItems] = useState<SavedMessageSnapshot[]>(() => getSavedMessages());

  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()),
    [items]
  );

  const refresh = () => setItems(getSavedMessages());

  const remove = (id: string) => {
    removeSavedMessage(id);
    refresh();
  };

  return (
    <div className="h-full flex flex-col bg-background-dark min-h-0 min-w-0">
      <div className="flex items-center gap-3 p-4 border-b border-background-light shrink-0">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="md:hidden p-2 hover:bg-background-light rounded-full transition-colors"
          aria-label={t('saved.backToChatsAria')}
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <Bookmark className="w-6 h-6 text-tg-link shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold text-text-primary truncate">{t('saved.title')}</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {t('saved.description')}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3">
        {sorted.length === 0 ? (
          <p className="text-text-secondary text-sm text-center py-12 max-w-md mx-auto">
            {t('saved.emptyState')}
          </p>
        ) : (
          sorted.map((s) => (
            <article
              key={`${s.id}-${s.savedAt}`}
              className="rounded-xl border border-background-light bg-background-medium p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="font-medium text-text-primary truncate">{s.senderName}</p>
                  <p className="text-xs text-text-secondary">
                    {s.chatTitle ? `${s.chatTitle} · ` : ''}
                    {format(new Date(s.createdAt), 'd MMM yyyy, HH:mm', { locale: language === 'ru' ? ru : undefined })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/chat/${s.chatId}`)}
                    className="p-2 rounded-lg hover:bg-background-light text-tg-link"
                    title={t('saved.openChatTitle')}
                    aria-label={t('saved.openChatTitle')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    className="p-2 rounded-lg hover:bg-background-light text-text-secondary"
                    title={t('saved.removeSavedTitle')}
                    aria-label={t('saved.removeSavedTitle')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {s.mediaUrl && s.contentType === 'IMAGE' && (
                <img
                  src={mediaUrl(s.mediaUrl)}
                  alt=""
                  className="rounded-lg max-h-40 object-contain mb-2"
                />
              )}
              {s.mediaUrl && s.contentType === 'VIDEO' && (
                <video src={mediaUrl(s.mediaUrl)} controls className="rounded-lg max-h-40 w-full mb-2" />
              )}
              {(s.contentType === 'VOICE' || s.contentType === 'AUDIO') && s.mediaUrl && (
                <audio src={mediaUrl(s.mediaUrl)} controls className="w-full max-w-sm mb-2" />
              )}
              {s.content && <p className="text-text-primary whitespace-pre-wrap break-words">{s.content}</p>}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
