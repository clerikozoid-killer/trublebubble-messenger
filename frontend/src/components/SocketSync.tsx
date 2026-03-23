import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useMessageStore } from '../stores/messageStore';
import { useChatStore } from '../stores/chatStore';
import { socket } from '../services/socket';
import type { ReceiptState } from '../utils/messageReceipt';

/**
 * Global socket listeners that update stores (receipts, cleared chats).
 */
export default function SocketSync() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;

    const onReceipt = (p: { messageId: string; chatId: string; receiptStatus: ReceiptState }) => {
      useMessageStore.getState().patchMessageReceipt(p.chatId, p.messageId, p.receiptStatus);
    };

    const onCleared = (p: { chatId: string }) => {
      useMessageStore.getState().clearChatMessages(p.chatId);
      void useChatStore.getState().fetchChats();
    };

    socket.on('message_receipt', onReceipt);
    socket.on('chat_cleared', onCleared);

    return () => {
      socket.off('message_receipt', onReceipt);
      socket.off('chat_cleared', onCleared);
    };
  }, [user]);

  return null;
}
