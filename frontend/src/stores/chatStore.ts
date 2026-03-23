import { create } from 'zustand';
import type { Chat, ChatMember } from '../types';
import { api } from '../services/api';

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
      set({ error: 'Failed to load chats', isLoading: false });
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
}));
