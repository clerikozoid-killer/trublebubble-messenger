import { create } from 'zustand';
import type { Message } from '../types';
import type { ReceiptState } from '../utils/messageReceipt';
import { api } from '../services/api';
import { socket } from '../services/socket';

interface MessageState {
  messages: Record<string, Message[]>;
  isLoading: boolean;
  error: string | null;

  // Actions
  setMessages: (chatId: string, messages: Message[]) => void;
  addMessage: (chatId: string, message: Message) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (chatId: string, messageId: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  fetchMessages: (chatId: string, before?: string) => Promise<Message[]>;
  sendMessage: (chatId: string, content: string, contentType?: string, replyToId?: string) => Promise<Message | null>;
  editMessage: (chatId: string, messageId: string, content: string) => Promise<void>;
  deleteMessage: (chatId: string, messageId: string, deleteForEveryone?: boolean) => Promise<void>;
  markAsRead: (chatId: string, messageId?: string) => void;
  patchMessageReceipt: (chatId: string, messageId: string, receiptStatus: ReceiptState) => void;
  clearChatMessages: (chatId: string) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: {},
  isLoading: false,
  error: null,

  setMessages: (chatId, messages) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: messages,
      },
    }));
  },

  addMessage: (chatId, message) => {
    set((state) => {
      const list = state.messages[chatId] || [];
      if (list.some((m) => m.id === message.id)) {
        return state;
      }
      return {
        messages: {
          ...state.messages,
          [chatId]: [...list, message],
        },
      };
    });
  },

  updateMessage: (chatId, messageId, updates) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map((m) =>
          m.id === messageId ? { ...m, ...updates } : m
        ),
      },
    }));
  },

  removeMessage: (chatId, messageId) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).filter((m) => m.id !== messageId),
      },
    }));
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  setError: (error) => {
    set({ error });
  },

  fetchMessages: async (chatId, before) => {
    set({ isLoading: true, error: null });
    
    try {
      const params = before ? `?before=${before}` : '';
      const messages = await api.get<Message[]>(`/messages/chat/${chatId}${params}`);
      
      const existingMessages = get().messages[chatId] || [];
      const newMessages = params ? [...existingMessages, ...messages] : messages;
      
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: newMessages,
        },
        isLoading: false,
      }));
      
      return messages;
    } catch (error) {
      console.error('Fetch messages error:', error);
      set({ error: 'Failed to load messages', isLoading: false });
      return [];
    }
  },

  sendMessage: async (chatId, content, contentType = 'TEXT', replyToId) => {
    try {
      const message = await api.post<Message>(`/messages/chat/${chatId}`, {
        content,
        contentType,
        replyToId,
      });
      
      get().addMessage(chatId, message);
      return message;
    } catch (error) {
      console.error('Send message error:', error);
      return null;
    }
  },

  editMessage: async (chatId, messageId, content) => {
    try {
      const message = await api.patch<Message>(`/messages/${messageId}`, { content });
      get().updateMessage(chatId, messageId, message);
    } catch (error) {
      console.error('Edit message error:', error);
    }
  },

  deleteMessage: async (chatId, messageId, deleteForEveryone = false) => {
    try {
      await api.delete(`/messages/${messageId}?deleteForEveryone=${deleteForEveryone}`);
      get().updateMessage(chatId, messageId, { isDeleted: true, content: 'This message was deleted' });
    } catch (error) {
      console.error('Delete message error:', error);
    }
  },

  markAsRead: (chatId, messageId) => {
    socket.emit('mark_read', { chatId, messageId });
  },

  patchMessageReceipt: (chatId, messageId, receiptStatus) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map((m) =>
          m.id === messageId ? { ...m, receiptStatus } : m
        ),
      },
    }));
  },

  clearChatMessages: (chatId) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: [],
      },
    }));
  },
}));
