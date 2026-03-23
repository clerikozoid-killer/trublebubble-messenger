import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ChatThemeId = 'default' | 'ocean' | 'sunset' | 'forest' | 'mono';

export const CHAT_THEME_PRESETS: Record<
  ChatThemeId,
  { name: string; outgoing: string; incoming: string; wallpaper: string }
> = {
  default: {
    name: 'Default',
    outgoing: '#0088CC',
    incoming: '#182533',
    wallpaper: '#0e1621',
  },
  ocean: {
    name: 'Ocean',
    outgoing: '#1e6b8a',
    incoming: '#153040',
    wallpaper: '#0a1a22',
  },
  sunset: {
    name: 'Sunset',
    outgoing: '#8a4a6b',
    incoming: '#3a2530',
    wallpaper: '#1a1218',
  },
  forest: {
    name: 'Forest',
    outgoing: '#2d6b4a',
    incoming: '#1e3025',
    wallpaper: '#0f1812',
  },
  mono: {
    name: 'Mono',
    outgoing: '#4a5568',
    incoming: '#2d3748',
    wallpaper: '#171923',
  },
};

interface ChatThemeState {
  /** chatId -> theme id */
  themes: Record<string, ChatThemeId>;
  setChatTheme: (chatId: string, theme: ChatThemeId) => void;
  getChatTheme: (chatId: string) => ChatThemeId;
}

export const useChatThemeStore = create<ChatThemeState>()(
  persist(
    (set, get) => ({
      themes: {},
      setChatTheme: (chatId, theme) =>
        set((s) => ({
          themes: { ...s.themes, [chatId]: theme },
        })),
      getChatTheme: (chatId) => get().themes[chatId] ?? 'default',
    }),
    { name: 'truble-bubble-chat-themes' }
  )
);
