import type { AuthResponse, Chat, User } from '../types';
import { isDebugUiEnabled, logUi } from '../utils/debugUi';

/** Same origin as WebSocket (Netlify often sets only VITE_WS_URL — without this, /api hits netlify.app and browse/search hang or 404). */
const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_WS_URL ||
  ''
).replace(/\/$/, '');

class ApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
  }

  async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshToken) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return null;
      }

      const data = await response.json();
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;
      return data.accessToken;
    } catch (error) {
      console.error('Refresh token error:', error);
      this.clearTokens();
      return null;
    }
  }

  /** Render free часто "засыпает"; /health — самый дешёвый способ разбудить backend перед сигналингом. */
  async wakeBackend(): Promise<void> {
    const url = `${API_BASE_URL}/health`;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 30000);
    try {
      const r = await fetch(url, { method: 'GET', cache: 'no-store', signal: controller.signal });
      if (!r.ok) {
        throw new Error(`Wake failed: ${r.status}`);
      }
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}/api${endpoint}`;
    const method = (options.method || 'GET').toUpperCase();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (isDebugUiEnabled()) {
      logUi('api', 'fetch', {
        method,
        endpoint,
        url: url.slice(0, 200),
        hasAuthHeader: Boolean(this.accessToken),
      });
    }

    const controller = new AbortController();
    const timeoutMs = 60000;
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeoutId);
    }

    // If unauthorized, try to refresh token
    if (response.status === 401 && this.refreshToken) {
      if (isDebugUiEnabled()) {
        logUi('api', '401-refresh', { endpoint });
      }
      const newToken = await this.refreshAccessToken();
      
      if (newToken) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
        const c2 = new AbortController();
        const t2 = window.setTimeout(() => c2.abort(), timeoutMs);
        try {
          response = await fetch(url, {
            ...options,
            headers,
            signal: c2.signal,
          });
        } finally {
          window.clearTimeout(t2);
        }
      }
    }

    if (isDebugUiEnabled()) {
      logUi('api', 'response', {
        endpoint,
        status: response.status,
        ok: response.ok,
      });
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      if (isDebugUiEnabled()) {
        logUi('api', 'error-body', { endpoint, error: (error as { error?: string }).error });
      }
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Auth endpoints
  async sendCode(phone: string): Promise<{ success: boolean; code?: string }> {
    return this.post('/auth/send-code', { phone });
  }

  async verifyCode(phone: string, code: string, displayName?: string, username?: string): Promise<AuthResponse> {
    return this.post('/auth/verify', { phone, code, displayName, username });
  }

  async login(login: string, password: string): Promise<AuthResponse> {
    return this.post('/auth/login', { login, password });
  }

  async register(
    email: string,
    password: string,
    displayName: string,
    username?: string
  ): Promise<AuthResponse> {
    return this.post('/auth/register', {
      email,
      password,
      displayName,
      username: username || undefined,
    });
  }

  async adminCreateUser(body: {
    email: string;
    password: string;
    displayName: string;
    username?: string;
    isAdmin?: boolean;
  }): Promise<{ success: boolean; user: unknown }> {
    return this.post('/admin/users', body);
  }

  async adminListUsers(): Promise<
    Array<{
      id: string;
      email: string | null;
      username: string | null;
      displayName: string;
      isAdmin: boolean;
      createdAt: string;
    }>
  > {
    return this.get('/admin/users');
  }

  async searchUsers(q: string): Promise<User[]> {
    return this.get(`/users/search?q=${encodeURIComponent(q)}`);
  }

  /** Пользователи для приглашения в группу (кроме себя) */
  async browseUsers(): Promise<User[]> {
    return this.get('/users/browse');
  }

  async searchMessages(
    q: string,
    chatId?: string
  ): Promise<
    Array<{
      id: string;
      chatId: string;
      content: string | null;
      contentType: string;
      createdAt: string;
      sender: { displayName: string };
      chat: { id: string; title: string | null; type: string };
    }>
  > {
    const qs = new URLSearchParams({ q });
    if (chatId) qs.set('chatId', chatId);
    return this.get(`/messages/search?${qs.toString()}`);
  }

  async updateChat(
    chatId: string,
    body: {
      title?: string;
      description?: string | null;
      avatarUrl?: string | null;
      username?: string | null;
    }
  ): Promise<Chat> {
    return this.patch<Chat>(`/chats/${chatId}`, body);
  }

  async clearChatHistory(chatId: string): Promise<{ success: boolean }> {
    return this.post(`/chats/${chatId}/clear-history`);
  }

  async addChatMembers(chatId: string, userIds: string[]): Promise<Chat> {
    return this.post<Chat>(`/chats/${chatId}/members`, { userIds });
  }

  async uploadChatMedia(
    chatId: string,
    file: Blob,
    filename = 'upload.bin'
  ): Promise<{
    mediaUrl: string;
    mediaSize: number;
    contentType: string;
    originalName: string;
  }> {
    const url = `${API_BASE_URL}/api/messages/chat/${encodeURIComponent(chatId)}/upload`;
    const headers: HeadersInit = {};
    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }
    const body = new FormData();
    body.append('file', file, filename);

    if (isDebugUiEnabled()) {
      logUi('api.upload', 'chat-media', {
        chatId,
        filename,
        blobSize: file.size,
        blobType: file.type || '(empty)',
      });
    }

    let response = await fetch(url, { method: 'POST', headers, body });

    if (response.status === 401 && this.refreshToken) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, { method: 'POST', headers, body });
      }
    }

    if (isDebugUiEnabled()) {
      logUi('api.upload', 'chat-media-response', { status: response.status, ok: response.ok });
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      if (isDebugUiEnabled()) {
        logUi('api.upload', 'chat-media-error', { error: (error as { error?: string }).error });
      }
      throw new Error((error as { error?: string }).error || 'Upload failed');
    }

    return response.json() as Promise<{
      mediaUrl: string;
      mediaSize: number;
      contentType: string;
      originalName: string;
    }>;
  }

  // Polls (group chats)
  async createPoll(
    chatId: string,
    body: {
      question: string;
      options: { text: string }[];
      isAnonymous?: boolean;
      isMultiChoice?: boolean;
      isQuiz?: boolean;
      correctOptionIndex?: number;
      mediaUrl?: string | null;
      mediaCaption?: string | null;
    }
  ): Promise<{ pollId: string }> {
    return this.post(`/polls/chat/${encodeURIComponent(chatId)}`, body);
  }

  async votePoll(pollId: string, optionId: string): Promise<{
    pollId: string;
    options: Array<{ id: string; voteCount: number }>;
  }> {
    return this.post(`/polls/${encodeURIComponent(pollId)}/vote`, { optionId });
  }

  async getPollSummary(
    pollId: string
  ): Promise<{
    pollId: string;
    chatId: string;
    question: string;
    isAnonymous: boolean;
    isMultiChoice: boolean;
    isQuiz: boolean;
    correctOptionId: string | null;
    myOptionIds: string[];
    mediaUrl: string | null;
    mediaCaption: string | null;
    options: Array<{ id: string; text: string; order: number; voteCount: number }>;
  }> {
    return this.get(`/polls/${encodeURIComponent(pollId)}/summary`);
  }

  async uploadAvatar(file: File): Promise<User> {
    const url = `${API_BASE_URL}/api/users/me/avatar`;
    const headers: HeadersInit = {};
    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }
    const body = new FormData();
    body.append('avatar', file);

    if (isDebugUiEnabled()) {
      logUi('api.upload', 'avatar', { filename: file.name, size: file.size, type: file.type });
    }

    let response = await fetch(url, { method: 'POST', headers, body });

    if (response.status === 401 && this.refreshToken) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, { method: 'POST', headers, body });
      }
    }

    if (isDebugUiEnabled()) {
      logUi('api.upload', 'avatar-response', { status: response.status, ok: response.ok });
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error((error as { error?: string }).error || 'Upload failed');
    }

    return response.json() as Promise<User>;
  }
}

export const api = new ApiService();
