import { create } from 'zustand';
import type { Chat, ChatMember, Message } from '../types';
import { api } from '../services/api';
import { DICT, type I18nKey } from '../i18n/dictionary';
import { DEFAULT_LANG, type LangCode } from '../i18n/languages';
import { useLanguageStore } from './languageStore';

function t(key: I18nKey): string {
  const cur = (useLanguageStore.getState().language ?? DEFAULT_LANG) as LangCode;
  if (cur === 'ru') return DICT.ru?.[key] ?? DICT.en?.[key] ?? key;
  return DICT[cur]?.[key] ?? DICT.en?.[key] ?? key;
}

interface ChatState {
  chats: Chat[];
  currentChat: Chat | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setChats: (chats: Chat[]) => void;
  addChat: (chat: Chat) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  removeChat: (chatId: string) => void;
  setCurrentChat: (chat: Chat | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  fetchChats: () => Promise<void>;
  fetchChat: (chatId: string) => Promise<Chat | null>;
  createChat: (type: string, memberIds?: string[], title?: string, username?: string) => Promise<Chat>;
  updateChatMembers: (chatId: string, members: ChatMember[]) => void;
  markChatAsRead: (chatId: string) => void;
  /** Обновить превью чата из сокета без полного fetchChats (быстрее). */
  applyIncomingMessage: (
    message: Message,
    currentUserId: string,
    activeChatId: string | null | undefined
  ) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  currentChat: null,
  isLoading: false,
  error: null,

  setChats: (chats) => {
    set({ chats });
  },

  addChat: (chat) => {
    const { chats } = get();
    const existingIndex = chats.findIndex((c) => c.id === chat.id);
    
    if (existingIndex >= 0) {
      const newChats = [...chats];
      newChats[existingIndex] = chat;
      set({ chats: newChats });
    } else {
      set({ chats: [chat, ...chats] });
    }
  },

  updateChat: (chatId, updates) => {
    const { chats } = get();
    set({
      chats: chats.map((c) => (c.id === chatId ? { ...c, ...updates } : c)),
    });
    
    if (get().currentChat?.id === chatId) {
      set({ currentChat: { ...get().currentChat!, ...updates } });
    }
  },

  removeChat: (chatId) => {
    const { chats } = get();
    set({ chats: chats.filter((c) => c.id !== chatId) });
    
    if (get().currentChat?.id === chatId) {
      set({ currentChat: null });
    }
  },

  setCurrentChat: (chat) => {
    set({ currentChat: chat });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  setError: (error) => {
    set({ error });
  },

  fetchChats: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const chats = await api.get<Chat[]>('/chats');
      set({ chats, isLoading: false });
    } catch (error) {
      console.error('Fetch chats error:', error);
      set({ error: t('chat.store.failedToLoadChats'), isLoading: false });
    }
  },

  fetchChat: async (chatId) => {
    try {
      const chat = await api.get<Chat>(`/chats/${chatId}`);
      set({ currentChat: chat });
      return chat;
    } catch (error) {
      console.error('Fetch chat error:', error);
      return null;
    }
  },

  createChat: async (type, memberIds = [], title, username) => {
    const chat = await api.post<Chat>('/chats', {
      type,
      memberIds,
      title,
      username,
    });
    
    get().addChat(chat);
    return chat;
  },

  updateChatMembers: (chatId, members) => {
    const { chats } = get();
    set({
      chats: chats.map((c) =>
        c.id === chatId ? { ...c, members } : c
      ),
    });
    
    if (get().currentChat?.id === chatId) {
      set({ currentChat: { ...get().currentChat!, members } });
    }
  },

  markChatAsRead: (chatId) => {
    const { chats } = get();
    set({
      chats: chats.map((c) =>
        c.id === chatId ? { ...c, unreadCount: 0 } : c
      ),
    });
  },

  applyIncomingMessage: (message, currentUserId, activeChatId) => {
    const { chats } = get();
    const idx = chats.findIndex((c) => c.id === message.chatId);
    if (idx < 0) {
      void get().fetchChats();
      return;
    }
    const chat = chats[idx];
    const fromOther = message.senderId !== currentUserId;
    const isViewing = activeChatId === message.chatId;
    let unread = Number(chat.unreadCount ?? 0);
    if (fromOther) {
      unread = isViewing ? 0 : unread + 1;
    }
    const updated: Chat = {
      ...chat,
      updatedAt: message.createdAt,
      messages: [message],
      unreadCount: unread,
    };
    const newChats = [...chats];
    newChats[idx] = updated;
    set({ chats: newChats });
    if (get().currentChat?.id === message.chatId) {
      set({ currentChat: { ...get().currentChat!, ...updated } });
    }
  },
}));
