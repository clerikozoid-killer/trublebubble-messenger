import { io, Socket } from 'socket.io-client';
import { isDebugUiEnabled, logUi, sanitizeSocketPayload } from '../utils/debugUi';

// Для socket.io клиенту нужен URL backend'а (обычно совпадает с VITE_API_URL).
// Если `VITE_WS_URL` не задан, берём `VITE_API_URL` — так звонки не зависят от наличия отдельной переменной.
const WS_URL = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || '';

class SocketService {
  private socket: Socket | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (isDebugUiEnabled()) {
      logUi('socket', 'connect-attempt', {
        url: WS_URL || '(same-origin)',
        path: '/socket.io',
        tokenLen: token?.length ?? 0,
      });
    }

    this.socket = io(WS_URL || undefined, {
      auth: { token },
      // Для polling/прокси токен может приходить не из handshake.auth — дублируем в query.
      query: { token },
      // Prefer WebSocket only for lower latency (no polling bootstrap).
      // If your network blocks WebSocket, switch back to polling+websocket.
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: Infinity,
      // Быстрее восстанавливаемся после обрыва.
      reconnectionDelay: 800,
      reconnectionDelayMax: 20000,
      timeout: 45000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      if (isDebugUiEnabled()) {
        logUi('socket', 'connected', { id: this.socket?.id });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (isDebugUiEnabled()) {
        logUi('socket', 'disconnected', { reason });
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      if (isDebugUiEnabled()) {
        logUi('socket', 'connect_error', { message: String(error?.message ?? error) });
      }
    });

    // Forward events to registered listeners
    const events = [
      'new_message',
      'message_edited',
      'message_deleted',
      'message_sent',
      'message_delivered',
      'message_read',
      'message_receipt',
      'chat_read',
      'chat_cleared',
      'user_online',
      'user_offline',
      'typing',
      'call_offer',
      'call_answer',
      'call_ice',
      'call_end',
      'call_rejected',
      'poll_updated',
      'error',
    ];

    events.forEach((event) => {
      this.socket?.on(event, (data) => {
        if (isDebugUiEnabled()) {
          logUi('socket.in', event, { payload: sanitizeSocketPayload(data) });
        }
        this.listeners.get(event)?.forEach((callback) => callback(data));
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: string, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(event: string, data?: any) {
    if (!this.socket?.connected) {
      if (isDebugUiEnabled()) {
        logUi('socket', 'emit-blocked', {
          event,
          reason: 'not_connected',
          hasSocketInstance: Boolean(this.socket),
        });
      }
      console.warn('Socket not connected');
      return;
    }
    if (isDebugUiEnabled()) {
      logUi('socket.out', event, { payload: sanitizeSocketPayload(data) });
    }
    this.socket.emit(event, data);
  }

  joinChat(chatId: string) {
    this.emit('join_chat', chatId);
  }

  leaveChat(chatId: string) {
    this.emit('leave_chat', chatId);
  }

  sendMessage(data: {
    chatId: string;
    content?: string;
    contentType?: string;
    mediaUrl?: string;
    mediaSize?: number;
    replyToId?: string;
  }) {
    this.emit('send_message', data);
  }

  startTyping(chatId: string) {
    this.emit('typing_start', chatId);
  }

  stopTyping(chatId: string) {
    this.emit('typing_stop', chatId);
  }

  markRead(chatId: string, messageId?: string) {
    this.emit('mark_read', { chatId, messageId });
  }

  ackDelivered(chatId: string, messageId: string) {
    this.emit('ack_delivered', { chatId, messageId });
  }

  editMessage(messageId: string, content: string) {
    this.emit('edit_message', { messageId, content });
  }

  deleteMessage(messageId: string, deleteForEveryone: boolean = false) {
    this.emit('delete_message', { messageId, deleteForEveryone });
  }

  get connected() {
    return this.socket?.connected ?? false;
  }
}

export const socket = new SocketService();
