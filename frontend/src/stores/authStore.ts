import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '../types';
import { api } from '../services/api';
import { socket } from '../services/socket';
import { isDebugUiEnabled, logUi } from '../utils/debugUi';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: true,
      error: null,

      setAuth: (user, accessToken, refreshToken) => {
        if (isDebugUiEnabled()) {
          logUi('auth', 'setAuth', { userId: user.id, username: user.username });
        }
        set({ user, accessToken, refreshToken, error: null, isLoading: false });
        api.setTokens(accessToken, refreshToken);
        socket.connect(accessToken);
      },

      setUser: (user) => {
        set({ user });
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setError: (error) => {
        set({ error });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          error: null,
          isLoading: false,
        });
        api.clearTokens();
      },

      initAuth: async () => {
        const { accessToken, refreshToken } = get();
        
        if (!accessToken || !refreshToken) {
          if (isDebugUiEnabled()) {
            logUi('auth', 'initAuth-skip', { reason: 'no_tokens' });
          }
          set({ isLoading: false });
          return;
        }

        if (isDebugUiEnabled()) {
          logUi('auth', 'initAuth-start', { hasAccessToken: true, hasRefreshToken: true });
        }

        try {
          api.setTokens(accessToken, refreshToken);
          const user = await api.get<User>('/users/me');
          set({ user, isLoading: false });
          if (isDebugUiEnabled()) {
            logUi('auth', 'initAuth-ok', { userId: user.id });
          }
          // Login/Register connect the socket; after a full page reload only tokens are restored — reconnect or messaging silently no-ops.
          socket.connect(accessToken);
        } catch (error) {
          console.error('Init auth error:', error);
          if (isDebugUiEnabled()) {
            logUi('auth', 'initAuth-fail', { error: String(error) });
          }
          socket.disconnect();
          set({ user: null, accessToken: null, refreshToken: null, isLoading: false });
          api.clearTokens();
        }
      },
    }),
    {
      /** sessionStorage = отдельный вход в каждой вкладке. localStorage общий на origin — второй логин перезаписывал токены и «выбивал» остальные вкладки. */
      name: 'auth-session',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);
