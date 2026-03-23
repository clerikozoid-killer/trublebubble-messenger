import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, Camera, UserPlus } from 'lucide-react';
import { api } from '../services/api';
import type { Chat, User } from '../types';
import { mediaUrl } from '../utils/mediaUrl';

function memberLabel(count: number) {
  return `${count} ${count === 1 ? 'member' : 'members'}`;
}

export default function ChatInfoModal({
  chat,
  currentUserId,
  onClose,
  onOpenProfile,
  onChatUpdated,
}: {
  chat: Chat;
  currentUserId?: string;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
  onChatUpdated: (chat: Chat) => void;
}) {
  const myMembership = chat.members.find((m) => m.userId === currentUserId);
  const canManage = myMembership?.role === 'OWNER' || myMembership?.role === 'ADMIN';
  const isGroupish =
    chat.type === 'GROUP' || chat.type === 'SUPERGROUP' || chat.type === 'CHANNEL';

  const [title, setTitle] = useState(chat.title || '');
  const [username, setUsername] = useState(chat.username || '');
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [addSearch, setAddSearch] = useState('');
  const [inviteCandidates, setInviteCandidates] = useState<User[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(chat.title || '');
    setUsername(chat.username || '');
    setSaveError(null);
  }, [chat.id, chat.title, chat.username]);

  useEffect(() => {
    if (!isGroupish || !canManage) return;
    setBrowseLoading(true);
    void api
      .browseUsers()
      .then((users) => {
        const memberIds = new Set(chat.members.map((m) => m.userId));
        setInviteCandidates(users.filter((u) => !memberIds.has(u.id)));
      })
      .catch(() => setInviteCandidates([]))
      .finally(() => setBrowseLoading(false));
  }, [chat.id, chat.members, isGroupish, canManage]);

  const filteredInvitees = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    if (!q) return inviteCandidates;
    return inviteCandidates.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        (u.username && u.username.toLowerCase().includes(q))
    );
  }, [inviteCandidates, addSearch]);

  const handleSaveMeta = async () => {
    if (!canManage) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api.updateChat(chat.id, {
        title: title.trim() || undefined,
        username: username.trim() === '' ? null : username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
      });
      onChatUpdated(updated);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !canManage) return;
    setAvatarBusy(true);
    setSaveError(null);
    try {
      const { mediaUrl: url } = await api.uploadChatMedia(chat.id, file, file.name);
      const updated = await api.updateChat(chat.id, { avatarUrl: url });
      onChatUpdated(updated);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not upload photo');
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      const updated = await api.addChatMembers(chat.id, [userId]);
      onChatUpdated(updated);
      setInviteCandidates((prev) => prev.filter((u) => u.id !== userId));
      setAddSearch('');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Не удалось добавить участника');
    }
  };

  const avatarSrc = mediaUrl(chat.avatarUrl);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} aria-hidden />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[min(100vw-2rem,400px)] max-h-[85vh] overflow-hidden flex flex-col bg-background-medium rounded-2xl shadow-2xl border border-background-light">
        <div className="p-4 border-b border-background-light flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-text-primary">Chat info</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-background-light rounded-full"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="sr-only"
                onChange={handleAvatar}
              />
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-xl font-bold text-white">
                  {(chat.title || '?').charAt(0).toUpperCase()}
                </div>
              )}
              {canManage && isGroupish && (
                <button
                  type="button"
                  disabled={avatarBusy}
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-0.5 -right-0.5 w-8 h-8 bg-primary rounded-full flex items-center justify-center ring-2 ring-background-medium disabled:opacity-50"
                  aria-label="Change group photo"
                >
                  {avatarBusy ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
                  )}
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              {canManage && isGroupish ? (
                <>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1" htmlFor="chat-title">
                      Name
                    </label>
                    <input
                      id="chat-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1" htmlFor="chat-username">
                      Username (optional)
                    </label>
                    <input
                      id="chat-username"
                      type="text"
                      value={username}
                      onChange={(e) =>
                        setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                      }
                      placeholder="public_link"
                      className="w-full px-3 py-2 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSaveMeta()}
                    disabled={saving || !title.trim()}
                    className="w-full py-2 px-3 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                  >
                    {saving ? 'Saving…' : 'Save name & username'}
                  </button>
                </>
              ) : (
                <div>
                  <p className="font-semibold text-text-primary">{chat.title || 'Chat'}</p>
                  {chat.username && <p className="text-xs text-text-secondary">@{chat.username}</p>}
                </div>
              )}
              <p className="text-sm text-text-secondary">{memberLabel(chat.members.length)}</p>
            </div>
          </div>

          {chat.description && (
            <p className="text-sm text-text-primary border-t border-background-light pt-3">{chat.description}</p>
          )}

          {saveError && (
            <p className="text-status-danger text-sm" role="alert">
              {saveError}
            </p>
          )}

          {isGroupish && canManage && (
            <div className="border-t border-background-light pt-4 space-y-2">
              <p className="text-xs font-medium text-text-secondary uppercase">Добавить участников</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                <input
                  type="search"
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  placeholder="Фильтр по имени или @username…"
                  className="w-full pl-9 pr-3 py-2 bg-background-light rounded-lg text-sm text-text-primary placeholder-text-secondary border border-transparent focus:border-primary"
                />
              </div>
              {browseLoading && <p className="text-xs text-text-secondary">Загрузка списка…</p>}
              {!browseLoading && inviteCandidates.length === 0 && (
                <p className="text-xs text-text-secondary">
                  Нет других пользователей в системе — зарегистрируйте коллег, чтобы добавить их в группу.
                </p>
              )}
              {!browseLoading && filteredInvitees.length > 0 && (
                <ul className="space-y-1 max-h-48 overflow-y-auto rounded-lg border border-background-light/60 p-1">
                  {filteredInvitees.map((u) => (
                    <li key={u.id}>
                      <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-background-light text-sm">
                        {mediaUrl(u.avatarUrl) ? (
                          <img src={mediaUrl(u.avatarUrl)} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-primary/30 flex items-center justify-center text-xs font-semibold shrink-0">
                            {u.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary font-medium truncate">{u.displayName}</p>
                          {u.username && (
                            <p className="text-xs text-text-secondary truncate">@{u.username}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleAddMember(u.id)}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:opacity-90"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          В группу
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {!browseLoading &&
                inviteCandidates.length > 0 &&
                filteredInvitees.length === 0 &&
                addSearch.trim().length > 0 && (
                  <p className="text-xs text-text-secondary">Никого не найдено — попробуйте другой запрос.</p>
                )}
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-text-secondary uppercase mb-2">Members</p>
            <ul className="space-y-1">
              {chat.members.map((m) => (
                <li key={m.userId}>
                  <button
                    type="button"
                    onClick={() => {
                      if (m.userId !== currentUserId) onOpenProfile(m.userId);
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-background-light text-left transition-colors"
                  >
                    {mediaUrl(m.user.avatarUrl) ? (
                      <img
                        src={mediaUrl(m.user.avatarUrl)}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center text-sm font-semibold text-text-primary">
                        {m.user.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary font-medium truncate">{m.user.displayName}</p>
                      {m.user.username && (
                        <p className="text-xs text-text-secondary truncate">@{m.user.username}</p>
                      )}
                    </div>
                    <span className="text-xs text-text-secondary shrink-0">{m.role}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
