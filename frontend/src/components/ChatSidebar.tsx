import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useMatch } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { socket } from '../services/socket';
import {
  Search,
  Plus,
  MessageCircle,
  MoreVertical,
  Settings,
  LogOut,
  Users,
  Hash,
  User as UserIcon,
  UserCircle,
  Megaphone,
  Bookmark,
  ChevronDown,
  Moon,
  Pin,
  BellOff,
  Trash2,
  Ban,
  MessageSquare,
} from 'lucide-react';
import type { Chat, User } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { api } from '../services/api';
import clsx from 'clsx';
import { mediaUrl } from '../utils/mediaUrl';
import { resolveAppearance, useAppearanceStore } from '../stores/appearanceStore';
import { getPinnedChatIds, togglePinnedChat, isChatPinned } from '../utils/pinnedChats';
import { setChatMute } from '../utils/chatMute';
import { useI18n } from '../i18n/useI18n';

type MsgHit = Awaited<ReturnType<typeof api.searchMessages>>[number];

type ContextState = { chat: Chat; x: number; y: number } | null;

export default function ChatSidebar() {
  const navigate = useNavigate();
  const chatMatch = useMatch('/chat/:chatId');
  const profileMatch = useMatch('/profile/:userId');
  const settingsMatch = useMatch('/settings');
  const savedMatch = useMatch('/saved');
  const activeChatId = chatMatch?.params.chatId;
  const isDetailRoute = Boolean(chatMatch || profileMatch || settingsMatch || savedMatch);
  const { user, logout } = useAuthStore();
  const { t } = useI18n();
  const appearance = useAppearanceStore((s) => s.appearance);
  const setAppearance = useAppearanceStore((s) => s.setAppearance);
  const isDark = resolveAppearance(appearance) === 'dark';
  const { chats, fetchChats, createChat, isLoading, removeChat } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [globalMsgResults, setGlobalMsgResults] = useState<MsgHit[]>([]);
  const [globalMsgLoading, setGlobalMsgLoading] = useState(false);
  const [pinVersion, setPinVersion] = useState(0);
  const [contextMenu, setContextMenu] = useState<ContextState>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [modalQuery, setModalQuery] = useState('');
  const [modalContacts, setModalContacts] = useState<User[]>([]);
  const [modalContactsLoading, setModalContactsLoading] = useState(false);
  /** Avoid broken /uploads URL (wrong host) showing as empty image over text */
  const [headerAvatarFailed, setHeaderAvatarFailed] = useState(false);
  const [sidebarMenuExpanded, setSidebarMenuExpanded] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const bumpPins = () => setPinVersion((n) => n + 1);

  const parsePollStub = (content?: string): { kind: 'poll'; pollId: string } | null => {
    if (!content) return null;
    const t = content.trim();
    if (!t.startsWith('{')) return null;
    try {
      const parsed = JSON.parse(t) as { kind?: unknown; pollId?: unknown };
      if (parsed?.kind === 'poll' && typeof parsed?.pollId === 'string') {
        return { kind: 'poll', pollId: parsed.pollId };
      }
      return null;
    } catch {
      return null;
    }
  };

  const parseLocationStub = (
    content?: string
  ): { kind: 'location'; label: string; lat: number; lng: number } | null => {
    if (!content) return null;
    const t = content.trim();
    if (!t.startsWith('{')) return null;
    try {
      const parsed = JSON.parse(t) as { kind?: unknown; label?: unknown; lat?: unknown; lng?: unknown };
      if (parsed?.kind === 'location' && typeof parsed?.label === 'string') {
        const lat = typeof parsed?.lat === 'number' ? parsed.lat : Number(parsed.lat);
        const lng = typeof parsed?.lng === 'number' ? parsed.lng : Number(parsed.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { kind: 'location', label: parsed.label, lat, lng };
      }
      return null;
    } catch {
      return null;
    }
  };

  const lastMessagePreviewText = (chat: Chat): string => {
    const lastMessage = chat.messages?.[0];
    if (!lastMessage) return Number(chat.unreadCount) > 0 ? 'Новые сообщения' : 'Нет сообщений';
    if (parsePollStub(lastMessage.content)) return '📊 Опрос';
    if (parseLocationStub(lastMessage.content)) return '📍 Локация';
    if (lastMessage.mediaUrl && !lastMessage.content?.trim()) return '[вложение]';
    return lastMessage.content || (Number(chat.unreadCount) > 0 ? 'Новые сообщения' : 'Нет сообщений');
  };

  // (dedup) removed duplicate parsePollStub/lastMessagePreviewText

  useEffect(() => {
    // fetchChats uses Authorization header; ensure tokens are ready.
    if (!user?.id) return;
    void fetchChats();
  }, [user?.id, fetchChats]);

  useEffect(() => {
    if (toast) {
      const t = window.setTimeout(() => setToast(null), 2800);
      return () => window.clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    setHeaderAvatarFailed(false);
  }, [user?.id, user?.avatarUrl]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    void (async () => {
      try {
        const data = await api.searchUsers(q);
        if (!cancelled) setSearchResults(data);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchQuery]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setGlobalMsgResults([]);
      return;
    }
    const t = window.setTimeout(() => {
      setGlobalMsgLoading(true);
      void (async () => {
        try {
          const data = await api.searchMessages(q);
          setGlobalMsgResults(data.slice(0, 20));
        } catch {
          setGlobalMsgResults([]);
        } finally {
          setGlobalMsgLoading(false);
        }
      })();
    }, 320);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!showNewChat) {
      setModalContacts([]);
      return;
    }
    setModalContactsLoading(true);
    void api
      .browseUsers()
      .then((data) => setModalContacts(data))
      .catch(() => setModalContacts([]))
      .finally(() => setModalContactsLoading(false));
  }, [showNewChat]);

  const modalFilteredContacts = useMemo(() => {
    const q = modalQuery.trim().toLowerCase();
    if (!q) return modalContacts;
    return modalContacts.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        (u.username && u.username.toLowerCase().includes(q))
    );
  }, [modalContacts, modalQuery]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target : (e.target as Node | null)?.parentElement;
      if (contextMenu && !el?.closest('[data-chat-context]')) {
        setContextMenu(null);
      }
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [contextMenu]);

  const filteredChats = useMemo(() => {
    return chats.filter((chat) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();

      if (chat.type === 'PRIVATE') {
        const otherMember = chat.members.find((m) => m.userId !== user?.id)?.user;
        return (
          otherMember?.displayName.toLowerCase().includes(query) ||
          !!otherMember?.username?.toLowerCase().includes(query)
        );
      }

      return (
        !!chat.title?.toLowerCase().includes(query) || !!chat.username?.toLowerCase().includes(query)
      );
    });
  }, [chats, searchQuery, user?.id]);

  const sortedChats = useMemo(() => {
    const pinned = new Set(getPinnedChatIds());
    return [...filteredChats].sort((a, b) => {
      const pa = pinned.has(a.id) ? 0 : 1;
      const pb = pinned.has(b.id) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      const ta = new Date(a.updatedAt || a.createdAt).getTime();
      const tb = new Date(b.updatedAt || b.createdAt).getTime();
      return tb - ta;
    });
  }, [filteredChats, pinVersion]);

  const isDiscussionChat = useCallback((chat: Chat) => {
    const title = (chat.title || '').toLowerCase();
    return title.startsWith('обсуждение');
  }, []);

  const discussionChats = useMemo(
    () => sortedChats.filter((c) => isDiscussionChat(c)),
    [sortedChats, isDiscussionChat]
  );

  const regularChats = useMemo(
    () => sortedChats.filter((c) => !isDiscussionChat(c)),
    [sortedChats, isDiscussionChat]
  );

  const showGlobalPanel = searchQuery.trim().length >= 2;

  const handleStartChat = async (otherUserId: string) => {
    try {
      const chat = await createChat('PRIVATE', [otherUserId]);
      setShowNewChat(false);
      setModalQuery('');
      navigate(`/chat/${chat.id}`);
    } catch (error) {
      console.error('Start chat error:', error);
    }
  };

  const handleCreateGroup = () => {
    navigate('/settings?tab=create-group');
  };

  const handleCreateChannel = () => {
    navigate('/settings?tab=create-channel');
  };

  const getChatDisplayInfo = (chat: Chat) => {
    if (chat.type === 'PRIVATE') {
      const otherMember = chat.members.find((m) => m.userId !== user?.id)?.user;
      return {
        title: otherMember?.displayName || 'Unknown',
        username: otherMember?.username,
        avatar: otherMember?.avatarUrl,
        isOnline: otherMember?.isOnline,
      };
    }
    return {
      title: chat.title || 'Unknown',
      username: chat.username,
      avatar: chat.avatarUrl,
      isOnline: undefined,
    };
  };

  const getChatIcon = (chat: Chat) => {
    if (chat.type === 'PRIVATE') {
      return <MessageCircle className="w-5 h-5" />;
    }
    if (chat.type === 'CHANNEL') {
      return <Hash className="w-5 h-5" />;
    }
    return <Users className="w-5 h-5" />;
  };

  const openContext = useCallback((chat: Chat, clientX: number, clientY: number) => {
    setContextMenu({ chat, x: clientX, y: clientY });
  }, []);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onRowContextMenu = (e: React.MouseEvent, chat: Chat) => {
    e.preventDefault();
    e.stopPropagation();
    openContext(chat, e.clientX, e.clientY);
  };

  const onRowTouchStart = (e: React.TouchEvent, chat: Chat) => {
    clearLongPress();
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      openContext(chat, touch.clientX, touch.clientY);
      longPressTimer.current = null;
    }, 550);
  };

  const onRowTouchEnd = () => {
    clearLongPress();
  };

  const closeContext = () => setContextMenu(null);

  const handlePin = (chat: Chat) => {
    togglePinnedChat(chat.id);
    bumpPins();
    closeContext();
  };

  const handleMuteChat = (chat: Chat) => {
    setChatMute(chat.id, '8h');
    setToast('Уведомления отключены на 8 ч.');
    closeContext();
  };

  const handleDeleteRowChat = async (chat: Chat) => {
    if (!window.confirm('Удалить этот чат?')) {
      closeContext();
      return;
    }
    try {
      await api.delete(`/chats/${chat.id}`);
      removeChat(chat.id);
      if (activeChatId === chat.id) navigate('/');
    } catch {
      setToast('Не удалось удалить чат');
    }
    closeContext();
  };

  const handleBlockUser = () => {
    setToast('Блокировка пользователя будет в следующей версии');
    closeContext();
  };

  const privatePeerId = (chat: Chat) => chat.members.find((m) => m.userId !== user?.id)?.userId;

  const renderChatRow = (chat: Chat) => {
    const info = getChatDisplayInfo(chat);
    const lastMessage = chat.messages?.[0];
    const isActive = chat.id === activeChatId;
    const pinned = isChatPinned(chat.id);
    const unread = Number(chat.unreadCount) > 0;

    return (
      <div key={chat.id} className="relative">
        <button
          type="button"
          onClick={() => navigate(`/chat/${chat.id}`)}
          onContextMenu={(e) => onRowContextMenu(e, chat)}
          onTouchStart={(e) => onRowTouchStart(e, chat)}
          onTouchEnd={onRowTouchEnd}
          onTouchCancel={onRowTouchEnd}
          className={clsx(
            'w-full p-3 flex items-center gap-3 text-left transition-colors',
            isActive ? 'bg-tg-rowActive' : 'hover:bg-tg-rowHover'
          )}
        >
          <div className="relative flex-shrink-0">
            {mediaUrl(info.avatar) ? (
              <img
                src={mediaUrl(info.avatar)}
                alt=""
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-background-light flex items-center justify-center text-text-secondary">
                {getChatIcon(chat)}
              </div>
            )}
            {info.isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-status-online rounded-full border-2 border-background-medium" />
            )}
            {pinned && (
              <div className="absolute -top-0.5 -left-0.5 bg-background-medium rounded-full p-0.5 border border-background-light">
                <Pin className="w-3 h-3 text-tg-link" aria-hidden />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3
                className={clsx(
                  'truncate text-text-primary',
                  unread ? 'font-semibold' : 'font-medium'
                )}
              >
                {info.title}
              </h3>
              {lastMessage && (
                <span className="text-xs text-text-secondary flex-shrink-0">
                  {formatDistanceToNow(new Date(lastMessage.createdAt), {
                    addSuffix: false,
                  })}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {chat.type !== 'PRIVATE' && (
                <span className="text-xs text-text-secondary">{getChatIcon(chat)}</span>
              )}
              <p className="text-sm text-text-secondary truncate">
                {lastMessagePreviewText(chat)}
              </p>
              {Number(chat.unreadCount) > 0 && (
                <span className="flex-shrink-0 min-w-[1.25rem] h-5 px-1 bg-primary rounded-full text-xs text-white flex items-center justify-center font-medium">
                  {Number(chat.unreadCount) > 99 ? '99+' : chat.unreadCount}
                </span>
              )}
            </div>
          </div>
        </button>
      </div>
    );
  };

  return (
    <div
      className={clsx(
        'bg-background-medium flex flex-col border-r border-background-light shrink-0 flex-none',
        'w-full min-w-0 md:w-80 md:min-w-[280px] lg:w-96',
        isDetailRoute && 'max-md:hidden',
        'min-h-0 h-full'
      )}
    >
      {toast && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 bg-background-light rounded-xl shadow-xl text-sm text-text-primary border border-background-medium max-w-[90vw] text-center"
          role="status"
        >
          {toast}
        </div>
      )}

      <div className="p-3 pb-2 border-b border-background-light shrink-0 relative z-40">
        <div className="flex items-center gap-2 min-h-[3.5rem]">
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="relative shrink-0 w-14 h-14 rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Открыть настройки профиля"
          >
            {mediaUrl(user?.avatarUrl) && !headerAvatarFailed ? (
              <img
                src={mediaUrl(user?.avatarUrl)}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setHeaderAvatarFailed(true)}
              />
            ) : (
              <div className="w-full h-full rounded-full bg-primary flex items-center justify-center">
                <span className="text-xl font-semibold text-white">
                  {user?.displayName?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-status-online rounded-full border-2 border-background-medium pointer-events-none" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="flex-1 min-w-0 text-left rounded-lg hover:bg-tg-rowHover/80 px-1 -mx-1 transition-colors py-0.5"
          >
            <span className="font-semibold text-text-primary truncate block">{user?.displayName}</span>
            <span className="text-sm text-tg-link block truncate mt-0.5">online</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSidebarMenuExpanded((v) => !v);
            }}
            className="shrink-0 p-2 rounded-lg hover:bg-tg-rowHover text-text-secondary z-10"
            aria-expanded={sidebarMenuExpanded}
            aria-label={sidebarMenuExpanded ? 'Свернуть меню' : 'Развернуть меню'}
          >
            <ChevronDown
              className={clsx(
                'w-5 h-5 transition-transform duration-200',
                sidebarMenuExpanded && 'rotate-180'
              )}
            />
          </button>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-tg-rowHover rounded-full transition-colors"
              aria-label="More"
            >
              <MoreVertical className="w-5 h-5 text-text-secondary" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-[45]"
                  onClick={() => setShowMenu(false)}
                  aria-hidden
                />
                <div className="absolute right-0 top-full mt-1 w-52 bg-background-light rounded-xl shadow-xl z-[50] py-1 animate-scale-in border border-background-light/80">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      logout();
                      socket.disconnect();
                      navigate('/login');
                    }}
                    className="w-full px-4 py-2.5 text-left text-status-danger hover:bg-tg-rowHover flex items-center gap-3 transition-colors text-sm"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {sidebarMenuExpanded && (
          <nav className="mt-3 space-y-0.5" aria-label="Main menu">
            {[
              { icon: UserIcon, label: 'Мой профиль', onClick: () => navigate('/settings'), disabled: false },
              { icon: Users, label: 'Создать группу', onClick: handleCreateGroup, disabled: false },
              { icon: Megaphone, label: 'Создать канал', onClick: handleCreateChannel, disabled: false },
              {
                icon: UserCircle,
                label: 'Контакты',
                onClick: () => setShowNewChat(true),
                disabled: false,
              },
              { icon: Bookmark, label: 'Избранное', onClick: () => navigate('/saved'), disabled: false },
              { icon: Settings, label: 'Настройки', onClick: () => navigate('/settings'), disabled: false },
            ].map(({ icon: Icon, label, onClick, disabled }) => (
              <button
                key={label}
                type="button"
                disabled={disabled}
                title={disabled ? 'Скоро' : undefined}
                onClick={() => {
                  if (disabled) return;
                  onClick();
                }}
                className={clsx(
                  'w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-left text-sm transition-colors',
                  disabled
                    ? 'text-text-secondary/50 cursor-not-allowed'
                    : 'text-text-primary hover:bg-tg-rowHover'
                )}
              >
                <Icon className="w-[22px] h-[22px] text-text-secondary shrink-0" />
                <span>{label}</span>
              </button>
            ))}
            <div className="mt-0.5 px-2 py-2.5 rounded-lg text-text-primary hover:bg-tg-rowHover">
              <div className="flex items-center gap-2 flex-wrap">
                <Moon className="w-[22px] h-[22px] text-text-secondary shrink-0" />
                <span className="text-sm whitespace-nowrap">Ночная тема</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isDark}
                  onClick={() => setAppearance(isDark ? 'light' : 'dark')}
                  className={clsx(
                    'inline-flex h-7 w-12 shrink-0 items-center rounded-full px-0.5 transition-colors',
                    isDark ? 'bg-tg-link justify-end' : 'bg-background-light justify-start'
                  )}
                >
                  <span className="h-5 w-5 rounded-full bg-white shadow shrink-0 pointer-events-none" />
                </button>
              </div>
            </div>
          </nav>
        )}
      </div>

      <div className="p-3 pt-2 shrink-0 relative z-30" ref={searchWrapRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary pointer-events-none z-[1]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск или начать новый чат"
            className="w-full pl-10 pr-4 py-2.5 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary placeholder-text-secondary text-sm transition-colors"
            autoComplete="off"
          />

          {showGlobalPanel && (
            <div className="absolute left-0 right-0 top-full mt-1 max-h-[min(60vh,420px)] overflow-y-auto rounded-xl border border-background-light bg-background-medium shadow-2xl z-40 py-2 text-sm">
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Чаты
              </p>
              {sortedChats.length === 0 ? (
                <p className="px-3 py-2 text-text-secondary">Нет совпадений в списке</p>
              ) : (
                <ul className="max-h-32 overflow-y-auto">
                  {sortedChats.slice(0, 8).map((chat) => {
                    const info = getChatDisplayInfo(chat);
                    return (
                      <li key={chat.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-tg-rowHover flex items-center gap-2"
                          onClick={() => {
                            navigate(`/chat/${chat.id}`);
                            setSearchQuery('');
                          }}
                        >
                          <MessageCircle className="w-4 h-4 shrink-0 text-text-secondary" />
                          <span className="truncate">{info.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary border-t border-background-light mt-1">
                Люди
              </p>
              {searchLoading ? (
                <p className="px-3 py-2 text-text-secondary">Поиск…</p>
              ) : searchResults.length === 0 ? (
                <p className="px-3 py-2 text-text-secondary">Нет пользователей</p>
              ) : (
                <ul className="max-h-40 overflow-y-auto">
                  {searchResults.slice(0, 10).map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-tg-rowHover flex items-center gap-2"
                        onClick={() => {
                          void handleStartChat(u.id);
                          setSearchQuery('');
                        }}
                      >
                        <UserIcon className="w-4 h-4 shrink-0 text-text-secondary" />
                        <span className="truncate">{u.displayName}</span>
                        {u.username && (
                          <span className="text-text-secondary truncate text-xs">@{u.username}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary border-t border-background-light mt-1">
                Сообщения
              </p>
              {globalMsgLoading ? (
                <p className="px-3 py-2 text-text-secondary">Поиск…</p>
              ) : globalMsgResults.length === 0 ? (
                <p className="px-3 py-2 text-text-secondary">Нет сообщений</p>
              ) : (
                <ul>
                  {globalMsgResults.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-tg-rowHover flex gap-2 items-start"
                        onClick={() => {
                          navigate(`/chat/${m.chatId}`);
                          setSearchQuery('');
                        }}
                      >
                        <MessageSquare className="w-4 h-4 shrink-0 text-text-secondary mt-0.5" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs text-tg-link truncate">
                            {m.chat.title || m.chat.type}
                          </span>
                          <span className="text-text-primary line-clamp-2">
                            {m.content || '…'} · {m.sender.displayName}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-background-light skeleton" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-background-light rounded skeleton" />
                  <div className="h-3 w-32 bg-background-light rounded skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedChats.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-50" />
            <p className="text-text-secondary">Нет чатов</p>
            <p className="text-text-secondary text-sm mt-1">Начните новый разговор</p>
          </div>
        ) : (
          <div className="divide-y divide-background-light">
              {discussionChats.length > 0 && (
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {t('chat.discussions')}
              </div>
            )}
            {discussionChats.map((chat) => renderChatRow(chat))}
            {regularChats.length > 0 && (
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {t('chat.chats')}
              </div>
            )}
            {regularChats.map((chat) => renderChatRow(chat))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-background-light shrink-0">
        <button
          type="button"
          onClick={() => setShowNewChat(true)}
          className="w-full py-2.5 px-4 border border-background-light hover:bg-tg-rowHover text-text-primary font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="w-5 h-5 text-primary" />
          Новое сообщение
        </button>
      </div>

      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[90]" aria-hidden onClick={closeContext} />
          <div
            data-chat-context
            className="fixed z-[100] min-w-[200px] rounded-xl border border-background-light bg-background-light py-1 shadow-2xl animate-scale-in"
            style={{
              left: Math.max(
                8,
                Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 220 : 200)
              ),
              top: Math.max(
                8,
                Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 240 : 200)
              ),
            }}
          >
            <button
              type="button"
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-tg-rowHover flex items-center gap-2"
              onClick={() => handlePin(contextMenu.chat)}
            >
              <Pin className="w-4 h-4" />
              {isChatPinned(contextMenu.chat.id) ? t('sidebar.context.unpinChat') : t('sidebar.context.pinChat')}
            </button>
            <button
              type="button"
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-tg-rowHover flex items-center gap-2"
              onClick={() => handleMuteChat(contextMenu.chat)}
            >
              <BellOff className="w-4 h-4" />
              Без звука 8 ч.
            </button>
            <button
              type="button"
              className="w-full px-4 py-2.5 text-left text-sm text-status-danger hover:bg-tg-rowHover flex items-center gap-2"
              onClick={() => void handleDeleteRowChat(contextMenu.chat)}
            >
              <Trash2 className="w-4 h-4" />
              Удалить чат
            </button>
            {contextMenu.chat.type === 'PRIVATE' && privatePeerId(contextMenu.chat) && (
              <button
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-tg-rowHover flex items-center gap-2"
                onClick={() => handleBlockUser()}
              >
                <Ban className="w-4 h-4" />
                Заблокировать
              </button>
            )}
          </div>
        </>
      )}

      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 md:left-0 md:right-auto md:w-80 lg:w-96">
          <div className="w-full max-w-md bg-background-medium rounded-2xl shadow-2xl animate-scale-in max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-background-light flex items-center justify-between shrink-0">
              <h3 className="text-lg font-semibold text-text-primary">Новое сообщение</h3>
              <button
                type="button"
                onClick={() => {
                  setShowNewChat(false);
                  setModalQuery('');
                }}
                className="p-2 hover:bg-background-light rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                <input
                  type="text"
                  value={modalQuery}
                  onChange={(e) => setModalQuery(e.target.value)}
                  placeholder="Поиск по имени пользователя…"
                  className="w-full pl-10 pr-4 py-2.5 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary placeholder-text-secondary text-sm transition-colors"
                  autoFocus
                />
              </div>

              {modalContactsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-background-light skeleton" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-20 bg-background-light rounded skeleton" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {modalFilteredContacts.length > 0 ? (
                    <div className="space-y-2 max-h-[min(50vh,320px)] overflow-y-auto mb-3">
                      {modalFilteredContacts.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => handleStartChat(result.id)}
                          className="w-full p-3 flex items-center gap-3 hover:bg-background-light rounded-lg transition-colors"
                        >
                          <div className="relative shrink-0">
                            {mediaUrl(result.avatarUrl) ? (
                              <img
                                src={mediaUrl(result.avatarUrl)}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                                <span className="text-sm font-semibold text-white">
                                  {result.displayName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            {result.isOnline && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-status-online rounded-full border-2 border-background-light" />
                            )}
                          </div>
                          <div className="text-left min-w-0 flex-1">
                            <p className="font-medium text-text-primary truncate">{result.displayName}</p>
                            {result.username && (
                              <p className="text-sm text-text-secondary truncate">@{result.username}</p>
                            )}
                          </div>
                          {result.isOnline && (
                            <span className="shrink-0 text-xs text-status-online">online</span>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : modalContacts.length === 0 ? (
                    <p className="text-center text-text-secondary text-sm py-6">
                      Нет других пользователей для переписки.
                    </p>
                  ) : (
                    <p className="text-center text-text-secondary text-sm py-6">
                      Никого не найдено по запросу.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleCreateGroup}
                    className="w-full p-3 flex items-center gap-3 hover:bg-background-light rounded-lg transition-colors border border-dashed border-background-light"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-medium text-text-primary">Создать группу</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
