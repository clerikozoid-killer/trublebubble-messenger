import { useEffect } from 'react';
import { useMatch } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useMessageStore } from '../stores/messageStore';
import { useChatStore } from '../stores/chatStore';
import { socket } from '../services/socket';
import { api } from '../services/api';
import type { ReceiptState } from '../utils/messageReceipt';
import type { Message } from '../types';
import {
  playIncomingMessageSound,
  unlockNotificationAudio,
} from '../utils/messageNotificationSound';
import { useSoundSettingsStore } from '../stores/soundSettingsStore';

/**
 * Global socket listeners: receipts, cleared chats, incoming message (sidebar + sound).
 */
export default function SocketSync() {
  const user = useAuthStore((s) => s.user);
  const chatMatch = useMatch('/chat/:chatId');
  const activeChatId = chatMatch?.params.chatId ?? null;

  useEffect(() => {
    const unlock = () => unlockNotificationAudio();
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  /** ПК/браузер часто рвёт сокет во вкладке в фоне или после сна; телефон держит соединение лучше. */
  useEffect(() => {
    if (!user) return;
    let reconnectBusy = false;
    const reconnect = async () => {
      if (reconnectBusy) return;
      if (socket.connected) return;
      const { accessToken, refreshToken } = useAuthStore.getState();
      if (!accessToken) return;

      reconnectBusy = true;
      try {
        let nextToken = accessToken;
        if (refreshToken) {
          const refreshed = await api.refreshAccessToken();
          if (refreshed) nextToken = refreshed;
        }
        socket.connect(nextToken);
      } finally {
        reconnectBusy = false;
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') reconnect();
    };
    const onOnline = () => void reconnect();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);

    // Доп. страховка: если сеть/прокси "подвисли" и сокет умер без видимых событий,
    // периодически пытаемся переподключиться.
    const t = window.setInterval(() => void reconnect(), 20000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.clearInterval(t);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const onReceipt = (p: { messageId: string; chatId: string; receiptStatus: ReceiptState }) => {
      useMessageStore.getState().patchMessageReceipt(p.chatId, p.messageId, p.receiptStatus);
    };

    const onCleared = (p: { chatId: string }) => {
      useMessageStore.getState().clearChatMessages(p.chatId);
      void useChatStore.getState().fetchChats();
    };

    const onNewMessage = (message: Message) => {
      if (message.senderId === user.id) return;
      const enabled = useSoundSettingsStore.getState().enabled;
      const volume = useSoundSettingsStore.getState().volume;
      if (!enabled) return;

      void playIncomingMessageSound(volume);
      useChatStore.getState().applyIncomingMessage(message, user.id, activeChatId);
    };

    socket.on('message_receipt', onReceipt);
    socket.on('chat_cleared', onCleared);
    socket.on('new_message', onNewMessage);

    return () => {
      socket.off('message_receipt', onReceipt);
      socket.off('chat_cleared', onCleared);
      socket.off('new_message', onNewMessage);
    };
  }, [user, activeChatId]);

  return null;
}
