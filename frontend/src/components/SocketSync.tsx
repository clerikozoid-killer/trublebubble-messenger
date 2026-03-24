import { useEffect } from 'react';
import { useMatch } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useMessageStore } from '../stores/messageStore';
import { useChatStore } from '../stores/chatStore';
import { socket } from '../services/socket';
import type { ReceiptState } from '../utils/messageReceipt';
import type { Message } from '../types';
import {
  playIncomingMessageSound,
  unlockNotificationAudio,
} from '../utils/messageNotificationSound';

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
    return () => document.removeEventListener('pointerdown', unlock);
  }, []);

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
      playIncomingMessageSound();
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
