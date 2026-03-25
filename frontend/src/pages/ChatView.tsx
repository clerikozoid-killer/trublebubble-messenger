import { useEffect, useState, useRef, useMemo, type CSSProperties } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useMessageStore } from '../stores/messageStore';
import { socket } from '../services/socket';
import { api } from '../services/api';
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Phone,
  Video,
  Send,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  File,
  Mic,
  Square,
  Reply,
  Edit,
  Trash2,
  X,
  Users,
  ChevronRight,
  ChevronLeft,
  BellOff,
  Download,
  Paintbrush,
  ShieldOff,
  Palette,
  Camera,
  MapPin,
  Image as ImageIcon,
  FolderOpen,
  Bookmark,
} from 'lucide-react';
import { isToday, isYesterday, format } from 'date-fns';
import type { Message, User } from '../types';
import ChatInfoModal from '../components/ChatInfoModal';
import EmojiPicker from '../components/EmojiPicker';
import { mediaUrl } from '../utils/mediaUrl';
import { getOutgoingReceipt } from '../utils/messageReceipt';
import { setChatMute, isChatMuted, muteLabel } from '../utils/chatMute';
import { useChatThemeStore, CHAT_THEME_PRESETS, type ChatThemeId } from '../stores/chatThemeStore';
import { parseActiveMention } from '../utils/mentionParse';
import { addSavedMessage } from '../utils/savedMessages';
import { getPinnedMessage, togglePinnedMessage, clearPinnedMessage } from '../utils/pinnedMessages';

function memberLabel(count: number) {
  return `${count} ${count === 1 ? 'member' : 'members'}`;
}

type PendingAttachment = { id: string; file: File; previewUrl: string };

type ChatSearchFilter = 'all' | 'IMAGE' | 'VIDEO' | 'FILE' | 'VOICE';

export default function ChatView() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentChat, fetchChat, markChatAsRead, removeChat, updateChat, createChat } = useChatStore();
  const { messages, fetchMessages, editMessage, deleteMessage, clearChatMessages, sendMessage } = useMessageStore();

  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState<Message | null>(null);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [chatSearchFilter, setChatSearchFilter] = useState<ChatSearchFilter>('all');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [menuPanel, setMenuPanel] = useState<'main' | 'mute'>('main');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [muteTick, setMuteTick] = useState(0);
  const [pinVersion, setPinVersion] = useState(0);
  const pinnedMessage = useMemo(() => {
    if (!user?.id || !chatId) return null;
    return getPinnedMessage(user.id, chatId);
  }, [user?.id, chatId, pinVersion]);
  const BUBBLE_BOT_USERNAME = 'bubble_bot';
  const chatThemeId = useChatThemeStore((s) => (chatId ? s.getChatTheme(chatId) : 'default'));
  const setChatTheme = useChatThemeStore((s) => s.setChatTheme);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const pendingAttachmentsRef = useRef<PendingAttachment[]>([]);
  pendingAttachmentsRef.current = pendingAttachments;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const attachCameraRef = useRef<HTMLInputElement>(null);
  const attachFileRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [inputSel, setInputSel] = useState(0);
  const [mentionPickIdx, setMentionPickIdx] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordStreamRef = useRef<MediaStream | null>(null);

  const stopMicStream = () => {
    recordStreamRef.current?.getTracks().forEach((t) => t.stop());
    recordStreamRef.current = null;
  };

  const chatMessages = chatId ? messages[chatId] || [] : [];

  const filteredMessages = useMemo(() => {
    const q = messageSearchQuery.trim().toLowerCase();
    return chatMessages.filter((m) => {
      if (m.isDeleted) return false;
      if (chatSearchFilter !== 'all') {
        if (chatSearchFilter === 'VOICE') {
          if (m.contentType !== 'VOICE' && m.contentType !== 'AUDIO') return false;
        } else if (m.contentType !== chatSearchFilter) {
          return false;
        }
      }
      if (!q) return true;
      const text = (m.content || '').toLowerCase();
      const name = (m.sender?.displayName || '').toLowerCase();
      return text.includes(q) || name.includes(q);
    });
  }, [chatMessages, messageSearchQuery, chatSearchFilter]);

  useEffect(() => {
    if (!showAttachMenu) return;
    const onDoc = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [showAttachMenu]);

  useEffect(() => {
    if (toast) {
      const t = window.setTimeout(() => setToast(null), 3200);
      return () => window.clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    return () => {
      pendingAttachmentsRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  useEffect(() => {
    if (chatId) {
      fetchChat(chatId);
      fetchMessages(chatId);
      markChatAsRead(chatId);
      socket.joinChat(chatId);
    }

    return () => {
      if (chatId) {
        socket.leaveChat(chatId);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      stopMicStream();
    };
  }, [chatId, fetchChat, fetchMessages, markChatAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredMessages]);

  useEffect(() => {
    const handleNewMessage = (message: Message) => {
      if (message.chatId === chatId) {
        useMessageStore.getState().addMessage(chatId!, message);

        if (message.senderId !== user?.id) {
          socket.ackDelivered(chatId!, message.id);
          queueMicrotask(() => {
            if (document.visibilityState === 'visible') {
              socket.markRead(chatId!, message.id);
            }
          });
        }
      }
    };

    const handleMessageEdited = (message: Message) => {
      if (message.chatId === chatId) {
        useMessageStore.getState().updateMessage(chatId!, message.id, message);
      }
    };

    const handleMessageDeleted = ({
      messageId,
      chatId: cId,
    }: {
      messageId: string;
      chatId: string;
    }) => {
      if (cId === chatId) {
        useMessageStore.getState().updateMessage(chatId!, messageId, {
          isDeleted: true,
          content: 'This message was deleted',
        });
      }
    };

    const handleTyping = ({
      userId,
      isTyping: typing,
    }: {
      chatId: string;
      userId: string;
      isTyping: boolean;
    }) => {
      if (userId !== user?.id) {
        setTypingUsers((prev) =>
          typing ? [...prev.filter((id) => id !== userId), userId] : prev.filter((id) => id !== userId)
        );
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('typing', handleTyping);
    };
  }, [chatId, user]);

  const uploadVoiceBlob = async (blob: Blob) => {
    if (!chatId) return;
    if (blob.size < 32) {
      setToast('Recording too short or empty — try holding a bit longer');
      return;
    }
    setUploadBusy(true);
    try {
      const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('mp4') ? 'm4a' : 'webm';
      const { mediaUrl, mediaSize } = await api.uploadChatMedia(chatId, blob, `voice.${ext}`);
      socket.sendMessage({
        chatId,
        content: '🎤 Voice message',
        contentType: 'VOICE',
        mediaUrl,
        mediaSize,
      });
    } catch {
      setToast('Could not send voice message');
    } finally {
      setUploadBusy(false);
    }
  };

  const handleVoiceToggle = async () => {
    if (!chatId || uploadBusy) return;
    if (isRecording) {
      const rec = mediaRecorderRef.current;
      if (rec && rec.state === 'recording') {
        try {
          rec.requestData();
        } catch {
          /* ignore */
        }
      }
      rec?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setToast('Microphone is not available in this browser');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream;
      recordChunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const rec = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      const outType = rec.mimeType || 'audio/webm';
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) recordChunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stopMicStream();
        setIsRecording(false);
        mediaRecorderRef.current = null;
        // Last `dataavailable` may run after `stop` in some browsers; yield once before building the blob.
        await new Promise((r) => setTimeout(r, 0));
        const blob = new Blob(recordChunksRef.current, {
          type: outType.split(';')[0],
        });
        recordChunksRef.current = [];
        await uploadVoiceBlob(blob);
      };
      // Omit timeslice so the UA emits one blob on stop (fewer empty recordings than chunked mode).
      rec.start();
      mediaRecorderRef.current = rec;
      setIsRecording(true);
    } catch {
      setToast('Allow microphone access to record voice');
    }
  };

  const handleSendOrVoice = () => {
    if (messageInput.trim() || editingMessage || pendingAttachments.length > 0) {
      void handleSendMessage();
    } else {
      void handleVoiceToggle();
    }
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const p = prev.find((x) => x.id === id);
      if (p) URL.revokeObjectURL(p.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  const handleSendMessage = async () => {
    if (editingMessage) {
      if (!messageInput.trim()) return;
      await editMessage(chatId!, editingMessage.id, messageInput);
      setEditingMessage(null);
      setMessageInput('');
      socket.stopTyping(chatId!);
      return;
    }

    const hasText = Boolean(messageInput.trim());
    const hasPending = pendingAttachments.length > 0;
    if (!hasText && !hasPending) return;
    if (!chatId) return;

    const rid = replyingTo?.id;
    setReplyingTo(null);

    setUploadBusy(true);
    try {
      if (hasText) {
        socket.sendMessage({
          chatId,
          content: messageInput.trim(),
          contentType: 'TEXT',
          replyToId: rid,
        });
        setMessageInput('');
      }

      const batch = [...pendingAttachments];
      setPendingAttachments([]);
      batch.forEach((p) => URL.revokeObjectURL(p.previewUrl));

      for (let i = 0; i < batch.length; i++) {
        const p = batch[i];
        const { mediaUrl, mediaSize, contentType } = await api.uploadChatMedia(chatId, p.file);
        socket.sendMessage({
          chatId,
          content: p.file.name,
          contentType,
          mediaUrl,
          mediaSize,
          replyToId: !hasText && i === 0 ? rid : undefined,
        });
      }

      socket.stopTyping(chatId);
    } catch {
      setToast('Could not send. Check connection and try again.');
    } finally {
      setUploadBusy(false);
    }
  };

  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket.startTyping(chatId!);
    }
  };

  const handleTypingStop = () => {
    if (isTyping) {
      setIsTyping(false);
      socket.stopTyping(chatId!);
    }
  };

  const handleEditMessage = (message: Message) => {
    setPendingAttachments((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
    setEditingMessage(message);
    setMessageInput(message.content || '');
    inputRef.current?.focus();
    setShowMessageMenu(null);
  };

  const handleDeleteMessage = async (message: Message, deleteForEveryone: boolean) => {
    await deleteMessage(chatId!, message.id, deleteForEveryone);
    setShowMessageMenu(null);
  };

  const getChatDisplayInfo = () => {
    if (!currentChat) return { title: 'Loading...', isOnline: false as boolean | undefined };

    if (currentChat.type === 'PRIVATE') {
      const otherMember = currentChat.members.find((m) => m.userId !== user?.id)?.user;
      return {
        title: otherMember?.displayName || 'Unknown',
        username: otherMember?.username,
        avatar: otherMember?.avatarUrl,
        isOnline: otherMember?.isOnline,
        memberCount: undefined as number | undefined,
      };
    }

    return {
      title: currentChat.title || 'Unknown',
      username: currentChat.username,
      avatar: currentChat.avatarUrl,
      isOnline: undefined as boolean | undefined,
      memberCount: currentChat.members.length,
    };
  };

  const info = getChatDisplayInfo();

  const [peerHeaderAvatarFailed, setPeerHeaderAvatarFailed] = useState(false);
  useEffect(() => {
    setPeerHeaderAvatarFailed(false);
  }, [chatId, info.avatar]);

  const mentionMembers = useMemo((): User[] => {
    if (!currentChat?.members?.length) return [];
    return currentChat.members.map((m) => m.user);
  }, [currentChat]);

  const activeMention = useMemo(
    () => parseActiveMention(messageInput, inputSel),
    [messageInput, inputSel]
  );

  const mentionFiltered = useMemo((): User[] => {
    if (!activeMention || !mentionMembers.length) return [];
    const q = activeMention.query.toLowerCase();
    return mentionMembers.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        (u.username && u.username.toLowerCase().includes(q))
    );
  }, [activeMention, mentionMembers]);

  useEffect(() => {
    setMentionPickIdx(0);
  }, [activeMention?.start, activeMention?.query]);

  const privatePeerUserId = currentChat?.members.find((m) => m.userId !== user?.id)?.userId;

  const openHeader = () => {
    if (!currentChat || !user) return;
    if (currentChat.type === 'PRIVATE') {
      if (privatePeerUserId) {
        navigate(`/profile/${privatePeerUserId}`);
      } else {
        setToast('No contact to show');
      }
      return;
    }
    setShowChatInfo(true);
  };

  const formatMessageDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Yesterday ' + format(d, 'HH:mm');
    return format(d, 'dd MMM HH:mm');
  };

  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';

    msgs.forEach((msg) => {
      const msgDate = format(new Date(msg.createdAt), 'yyyy-MM-dd');
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate(filteredMessages);

  const handleAttachFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const list = input.files;
    if (!list?.length || !chatId) {
      input.value = '';
      return;
    }
    const files = Array.from(list);
    input.value = '';

    const next: PendingAttachment[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPendingAttachments((prev) => [...prev, ...next]);
  };

  /** `display:none` на file input ломает programmatic `.click()` в части браузеров */
  const openFilePicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    setShowAttachMenu(false);
    window.setTimeout(() => ref.current?.click(), 0);
  };

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    if (!el) {
      setMessageInput((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart ?? messageInput.length;
    const end = el.selectionEnd ?? messageInput.length;
    const next = messageInput.slice(0, start) + emoji + messageInput.slice(end);
    setMessageInput(next);
    if (next.length > 0) handleTypingStart();
    queueMicrotask(() => {
      el.focus();
      const pos = start + [...emoji].length;
      el.setSelectionRange(pos, pos);
      setInputSel(pos);
    });
  };

  const pickMention = (u: User) => {
    const cursor = inputRef.current?.selectionStart ?? inputSel;
    const m = parseActiveMention(messageInput, cursor);
    if (!m) return;
    const insert = u.username ? `@${u.username} ` : `@${u.displayName.replace(/\s+/g, '_')} `;
    const before = messageInput.slice(0, m.start);
    const after = messageInput.slice(cursor);
    const next = before + insert + after;
    setMessageInput(next);
    const pos = before.length + insert.length;
    queueMicrotask(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(pos, pos);
        setInputSel(pos);
      }
    });
  };

  const handleSaveToSaved = (message: Message) => {
    if (message.isDeleted) return;
    const chatTitle = currentChat?.type === 'PRIVATE' ? undefined : currentChat?.title || undefined;
    addSavedMessage({
      id: message.id,
      chatId: message.chatId,
      chatTitle,
      senderName: message.sender.displayName,
      content: message.content,
      mediaUrl: message.mediaUrl,
      contentType: message.contentType,
      createdAt: message.createdAt,
    });
    setShowMessageMenu(null);
    setToast('Сохранено в избранное');
  };

  const handleTogglePinMessage = (message: Message) => {
    if (!user) return;
    if (message.isDeleted) return;
    const pinnedNow = togglePinnedMessage(user.id, message);
    setPinVersion((n) => n + 1);
    setShowMessageMenu(null);
    setToast(pinnedNow ? 'Сообщение закреплено' : 'Сообщение откреплено');
  };

  const handleDiscussMessage = async (message: Message) => {
    if (!user) return;
    if (message.isDeleted) return;

    try {
      const q = BUBBLE_BOT_USERNAME;
      const users = await api.searchUsers(q);
      const bot = users.find((u) => (u.username || '').toLowerCase() === q.toLowerCase());
      if (!bot?.id) {
        setToast('bubble_bot не найден');
        return;
      }

      const botChat = await createChat('PRIVATE', [bot.id]);
      const base =
        message.content?.trim() ||
        (message.mediaUrl ? '[attachment]' : '[message]');
      const topicText = `Обсуждение темы:\n${base}\n\nИсточник: ${message.sender.displayName}`;

      await sendMessage(botChat.id, topicText);
      setShowMessageMenu(null);
      navigate(`/chat/${botChat.id}`);
    } catch (e) {
      console.error('Discuss message error:', e);
      setToast('Не удалось открыть обсуждение');
    }
  };

  const handleDeleteChat = async () => {
    if (!chatId || !currentChat) return;
    if (!window.confirm('Delete this chat for everyone? This cannot be undone.')) return;
    try {
      await api.delete(`/chats/${chatId}`);
      removeChat(chatId);
      setShowMenu(false);
      setMenuPanel('main');
      navigate('/');
    } catch {
      setToast('Could not delete chat');
    }
  };

  const handleClearHistory = async () => {
    if (!chatId) return;
    if (!window.confirm('Clear all messages in this chat for everyone?')) return;
    try {
      await api.clearChatHistory(chatId);
      clearChatMessages(chatId);
      await fetchMessages(chatId);
      setShowMenu(false);
      setMenuPanel('main');
      setToast('Chat history cleared');
    } catch {
      setToast('Could not clear history');
    }
  };

  const exportChatHistory = () => {
    const blob = new Blob([JSON.stringify(chatMessages, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `trublebubble-chat-${chatId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setShowMenu(false);
    setMenuPanel('main');
    setToast('Chat exported');
  };

  const applyMute = (mode: 'off' | '1h' | '8h' | '1w' | 'forever') => {
    if (!chatId) return;
    setChatMute(chatId, mode);
    setMuteTick((n) => n + 1);
    setShowMenu(false);
    setMenuPanel('main');
    setToast(mode === 'off' ? 'Notifications unmuted' : 'Notifications muted');
  };

  const preset = chatId ? CHAT_THEME_PRESETS[chatThemeId] : CHAT_THEME_PRESETS.default;
  const muted = chatId ? isChatMuted(chatId) : false;

  const subtitleText = () => {
    if (info.isOnline === true) return 'Online';
    if (info.isOnline === false) return 'Last seen recently';
    if (info.memberCount != null) return memberLabel(info.memberCount);
    if (info.username) return `@${info.username}`;
    return '';
  };

  return (
    <div
      className="h-full flex flex-col bg-background-dark min-h-0 min-w-0"
      style={
        chatId && chatThemeId !== 'default'
          ? ({
              ['--color-chat-outgoing' as string]: preset.outgoing,
              ['--color-chat-incoming' as string]: preset.incoming,
            } as CSSProperties)
          : undefined
      }
    >
      <input
        ref={attachInputRef}
        type="file"
        className="sr-only"
        accept="image/*,video/*"
        multiple
        onChange={handleAttachFiles}
        tabIndex={-1}
        aria-hidden
      />
      <input
        ref={attachCameraRef}
        type="file"
        className="sr-only"
        accept="image/*"
        capture="environment"
        onChange={handleAttachFiles}
        tabIndex={-1}
        aria-hidden
      />
      <input
        ref={attachFileRef}
        type="file"
        className="sr-only"
        accept="*/*"
        multiple
        onChange={handleAttachFiles}
        tabIndex={-1}
        aria-hidden
      />

      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 bg-background-light rounded-xl shadow-xl text-sm text-text-primary border border-background-medium max-w-[90vw] text-center"
          role="status"
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-background-medium border-b border-background-light shrink-0">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="md:hidden p-2 hover:bg-background-light rounded-full transition-colors"
          aria-label="Back to chats"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </button>

        <div className="relative shrink-0 w-10 h-10">
          {mediaUrl(info.avatar) && !peerHeaderAvatarFailed ? (
            <button
              type="button"
              onClick={openHeader}
              className="rounded-full w-10 h-10 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <img
                src={mediaUrl(info.avatar)}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setPeerHeaderAvatarFailed(true)}
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={openHeader}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="text-lg font-semibold text-white">{info.title.charAt(0).toUpperCase()}</span>
            </button>
          )}
          {info.isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-status-online rounded-full border-2 border-background-medium pointer-events-none" />
          )}
        </div>

        <button
          type="button"
          onClick={openHeader}
          className="flex-1 min-w-0 text-left"
        >
          <h2 className="font-semibold text-text-primary truncate">{info.title}</h2>
          <p className="text-xs text-text-secondary truncate">{subtitleText()}</p>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setShowChatSearch((v) => !v);
              if (showChatSearch) {
                setMessageSearchQuery('');
                setChatSearchFilter('all');
              }
            }}
            className="p-2 hover:bg-background-light rounded-full transition-colors"
            aria-label="Search in chat"
            title="Search in chat"
          >
            <Search className="w-5 h-5 text-text-secondary" />
          </button>
          <button
            type="button"
            onClick={() => setToast('Voice calls will be available in a future update')}
            className="p-2 hover:bg-background-light rounded-full transition-colors hidden sm:block"
            aria-label="Voice call"
            title="Voice call"
          >
            <Phone className="w-5 h-5 text-text-secondary" />
          </button>
          <button
            type="button"
            onClick={() => setToast('Video calls will be available in a future update')}
            className="p-2 hover:bg-background-light rounded-full transition-colors hidden sm:block"
            aria-label="Video call"
            title="Video call"
          >
            <Video className="w-5 h-5 text-text-secondary" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setMenuPanel('main');
                setShowMenu(!showMenu);
              }}
              className="p-2 hover:bg-background-light rounded-full transition-colors"
              aria-label="Chat menu"
            >
              <MoreVertical className="w-5 h-5 text-text-secondary" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => {
                    setShowMenu(false);
                    setMenuPanel('main');
                  }}
                  aria-hidden
                />
                <div className="absolute right-0 top-full mt-2 w-60 bg-background-light rounded-xl shadow-xl z-20 py-1 animate-scale-in border border-background-medium/80">
                  {menuPanel === 'main' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          setShowChatSearch(true);
                        }}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium flex items-center gap-3 transition-colors text-sm"
                      >
                        <Search className="w-4 h-4 shrink-0" />
                        Search in chat
                      </button>
                      <button
                        type="button"
                        onClick={() => setMenuPanel('mute')}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium flex items-center gap-3 transition-colors text-sm"
                      >
                        <BellOff className="w-4 h-4 shrink-0" />
                        <span className="flex-1">Mute notifications</span>
                        <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
                      </button>
                      {muted && chatId && (
                        <p className="px-4 pb-1 text-xs text-text-secondary" key={muteTick}>
                          Until {muteLabel(chatId) ?? 'Forever'}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          setShowChatInfo(true);
                        }}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium flex items-center gap-3 transition-colors text-sm"
                      >
                        <Users className="w-4 h-4 shrink-0" />
                        Chat info
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          setShowThemeModal(true);
                        }}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium flex items-center gap-3 transition-colors text-sm"
                      >
                        <Palette className="w-4 h-4 shrink-0" />
                        Chat theme / wallpaper
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          setToast('Copying can be restricted in a future update.');
                        }}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium flex items-center gap-3 transition-colors text-sm"
                      >
                        <ShieldOff className="w-4 h-4 shrink-0" />
                        Restrict copying
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          exportChatHistory();
                        }}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium flex items-center gap-3 transition-colors text-sm"
                      >
                        <Download className="w-4 h-4 shrink-0" />
                        Export chat history
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          void handleClearHistory();
                        }}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium flex items-center gap-3 transition-colors text-sm"
                      >
                        <Paintbrush className="w-4 h-4 shrink-0" />
                        Clear history
                      </button>
                      {currentChat?.type !== 'PRIVATE' && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowMenu(false);
                            setShowChatInfo(true);
                          }}
                          className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium flex items-center gap-3 transition-colors text-sm"
                        >
                          <Users className="w-4 h-4 shrink-0" />
                          Add members
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          void handleDeleteChat();
                        }}
                        className="w-full px-4 py-2.5 text-left text-status-danger hover:bg-background-medium flex items-center gap-3 transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                        Delete chat
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setMenuPanel('main')}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium flex items-center gap-2 transition-colors text-sm border-b border-background-medium"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Mute notifications
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMute('off')}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium text-sm"
                      >
                        Disable mute
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMute('1h')}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium text-sm"
                      >
                        Mute for 1 hour
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMute('8h')}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium text-sm"
                      >
                        Mute for 8 hours
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMute('1w')}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium text-sm"
                      >
                        Mute for 1 week
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMute('forever')}
                        className="w-full px-4 py-2.5 text-left text-status-danger hover:bg-background-medium text-sm"
                      >
                        Mute forever
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showChatSearch && (
        <div className="px-4 py-2 bg-background-dark border-b border-background-light shrink-0 space-y-2">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-text-secondary shrink-0" />
            <input
              type="search"
              value={messageSearchQuery}
              onChange={(e) => setMessageSearchQuery(e.target.value)}
              placeholder="Поиск по сообщениям…"
              className="flex-1 min-w-0 bg-background-light rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary border border-transparent focus:border-primary"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                setShowChatSearch(false);
                setMessageSearchQuery('');
                setChatSearchFilter('all');
              }}
              className="p-2 hover:bg-background-light rounded-full"
              aria-label="Close search"
            >
              <X className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'all' as const, label: 'Все' },
                { id: 'IMAGE' as const, label: 'Фото' },
                { id: 'VIDEO' as const, label: 'Видео' },
                { id: 'FILE' as const, label: 'Файлы' },
                { id: 'VOICE' as const, label: 'Голос' },
              ] as const
            ).map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setChatSearchFilter(chip.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  chatSearchFilter === chip.id
                    ? 'bg-tg-link text-white'
                    : 'bg-background-light text-text-secondary hover:bg-background-medium'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={chatMessagesRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
        style={
          chatId && chatThemeId !== 'default'
            ? { backgroundColor: preset.wallpaper }
            : undefined
        }
      >
        {pinnedMessage && (
          <div className="flex items-center gap-3 bg-background-medium/80 border border-background-light/50 rounded-2xl px-3 py-2">
            <div className="shrink-0 w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
              📌
            </div>
            <button
              type="button"
              className="flex-1 min-w-0 text-left"
              onClick={() => {
                const el = document.getElementById(`message-${pinnedMessage.messageId}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              <p className="text-xs text-text-secondary truncate">
                Закреплено · {pinnedMessage.senderDisplayName}
              </p>
              <p className="text-sm text-text-primary truncate">
                {pinnedMessage.content?.trim() ||
                  (pinnedMessage.mediaUrl ? '[attachment]' : 'Сообщение')}
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!user?.id || !chatId) return;
                clearPinnedMessage(user.id, chatId);
                setPinVersion((n) => n + 1);
                setToast('Сообщение откреплено');
              }}
              className="px-3 py-2 rounded-xl bg-background-light hover:bg-background-medium text-sm text-text-primary transition-colors shrink-0"
            >
              Открепить
            </button>
          </div>
        )}
        {messageGroups.map((group) => (
          <div key={group.date}>
            <div className="flex items-center justify-center my-4">
              <span className="px-3 py-1 bg-background-medium rounded-full text-xs text-text-secondary">
                {isToday(new Date(group.date))
                  ? 'Today'
                  : isYesterday(new Date(group.date))
                    ? 'Yesterday'
                    : format(new Date(group.date), 'MMMM d, yyyy')}
              </span>
            </div>

            <div className="space-y-2">
              {group.messages.map((message, msgIndex) => {
                const isOutgoing = message.senderId === user?.id;
                const receipt =
                  isOutgoing && user ? getOutgoingReceipt(message, user.id) : null;
                const showAvatar =
                  !isOutgoing &&
                  (msgIndex === 0 || group.messages[msgIndex - 1]?.senderId !== message.senderId);

                const metaIncoming = 'text-[#c8d6e3]';
                const metaOutgoing = 'text-white/90';

                return (
                  <div
                    key={message.id}
                    id={`message-${message.id}`}
                    className="group"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMessageMenu(message);
                    }}
                  >
                    <div
                      className={`flex gap-2 ${isOutgoing ? 'justify-end' : 'justify-start items-end'} ${
                        showAvatar ? 'mt-4' : ''
                      }`}
                    >
                      {!isOutgoing && (
                        <div className="w-9 shrink-0 flex flex-col justify-end pb-0.5">
                          {showAvatar ? (
                            mediaUrl(message.sender.avatarUrl) ? (
                              <img
                                src={mediaUrl(message.sender.avatarUrl)}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                <span className="text-xs font-semibold text-white">
                                  {message.sender.displayName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )
                          ) : (
                            <div className="w-8 h-8 shrink-0" aria-hidden />
                          )}
                        </div>
                      )}
                    <div
                      className={`flex min-w-0 max-w-[calc(100%-2.5rem)] items-end gap-1 ${
                        isOutgoing ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <div
                        className={`max-w-[min(72vw,100%)] md:max-w-[min(60vw,28rem)] min-w-0 ${
                          isOutgoing ? 'message-outgoing' : 'message-incoming'
                        }`}
                      >
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            isOutgoing
                              ? 'bg-chat-outgoing rounded-br-md'
                              : 'bg-chat-incoming rounded-bl-md'
                          } ${
                            pinnedMessage?.messageId === message.id ? 'ring-2 ring-primary/60' : ''
                          }`}
                        >
                          {message.replyTo && (
                            <div className="border-l-2 border-text-secondary/30 pl-2 mb-2">
                              <p className="text-xs text-text-secondary">
                                {message.replyTo.sender.displayName}
                              </p>
                              <p className="text-sm text-text-secondary truncate">
                                {message.replyTo.content}
                              </p>
                            </div>
                          )}

                          {message.isDeleted ? (
                            <p className="text-text-secondary italic text-sm">This message was deleted</p>
                          ) : (
                            <>
                              {message.mediaUrl && (
                                <div className="mb-2">
                                  {message.contentType === 'IMAGE' ? (
                                    <img
                                      src={mediaUrl(message.mediaUrl)}
                                      alt=""
                                      className="rounded-lg max-w-full max-h-64 object-contain"
                                    />
                                  ) : message.contentType === 'VIDEO' ? (
                                    <video
                                      src={mediaUrl(message.mediaUrl)}
                                      controls
                                      className="rounded-lg max-w-full max-h-64"
                                    />
                                  ) : message.contentType === 'VOICE' || message.contentType === 'AUDIO' ? (
                                    <audio
                                      src={mediaUrl(message.mediaUrl)}
                                      controls
                                      className="w-full max-w-[260px]"
                                    />
                                  ) : (
                                    <div className="flex items-center gap-2 p-2 bg-background-dark/50 rounded-lg">
                                      <File className="w-5 h-5 text-text-secondary shrink-0" />
                                      <span className="text-sm text-text-primary truncate">
                                        {message.content || 'File'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {message.content && (
                                <p
                                  className={`text-text-primary whitespace-pre-wrap break-words ${
                                    message.mediaUrl ? 'mt-2 text-sm opacity-90' : ''
                                  }`}
                                >
                                  {message.content}
                                </p>
                              )}
                            </>
                          )}

                          <div
                            className={`flex items-center gap-1.5 mt-1.5 flex-wrap ${
                              isOutgoing ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {message.isEdited && (
                              <span
                                className={`text-xs ${isOutgoing ? metaOutgoing : metaIncoming}`}
                              >
                                (ред.)
                              </span>
                            )}
                            <span
                              className={`text-xs tabular-nums ${isOutgoing ? metaOutgoing : metaIncoming}`}
                            >
                              {formatMessageDate(message.createdAt)}
                            </span>
                            {isOutgoing && user && receipt && (
                              <span className="text-xs inline-flex items-center" title={receipt}>
                                {receipt === 'READ' ? (
                                  <CheckCheck className="w-4 h-4 text-[#b8e7ff]" />
                                ) : receipt === 'DELIVERED' ? (
                                  <CheckCheck className="w-4 h-4 text-white/75" />
                                ) : (
                                  <Check className="w-4 h-4 text-white/75" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                        <div
                          className={`relative flex shrink-0 items-center self-end pb-1 transition-opacity ${
                            showMessageMenu?.id === message.id
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                          }`}
                        >
                          <div className="flex flex-row items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => setReplyingTo(message)}
                              className="p-1.5 hover:bg-background-light rounded-full transition-colors shrink-0"
                              aria-label="Ответить"
                            >
                              <Reply className="w-4 h-4 text-text-secondary" />
                            </button>
                            {isOutgoing && (
                              <button
                                type="button"
                                onClick={() => handleEditMessage(message)}
                                className="p-1.5 hover:bg-background-light rounded-full transition-colors shrink-0"
                                aria-label="Редактировать"
                              >
                                <Edit className="w-4 h-4 text-text-secondary" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setShowMessageMenu(message)}
                              className="p-1.5 hover:bg-background-light rounded-full transition-colors shrink-0"
                              aria-label="Действия с сообщением"
                            >
                              <MoreVertical className="w-4 h-4 text-text-secondary" />
                            </button>
                          </div>

                          {showMessageMenu?.id === message.id && (
                            <>
                              <div
                                className="fixed inset-0 z-20"
                                onClick={() => setShowMessageMenu(null)}
                                aria-hidden
                              />
                              <div
                                className={`absolute top-full mt-1 min-w-[11rem] bg-background-light rounded-lg shadow-xl z-30 py-1 animate-scale-in ${
                                  isOutgoing ? 'right-0' : 'left-0'
                                }`}
                              >
                              {!message.isDeleted && (
                                <button
                                  type="button"
                                  onClick={() => handleSaveToSaved(message)}
                                  className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-background-medium flex items-center gap-2 transition-colors"
                                >
                                  <Bookmark className="w-4 h-4" />
                                  В избранное
                                </button>
                              )}
                              {!message.isDeleted && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleDiscussMessage(message);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-background-medium flex items-center gap-2 transition-colors"
                                >
                                  <span className="text-base leading-none">💬</span>
                                  Обсудить
                                </button>
                              )}
                              {!message.isDeleted && (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePinMessage(message)}
                                  className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-background-medium flex items-center gap-2 transition-colors"
                                >
                                  <MapPin className="w-4 h-4" />
                                  {pinnedMessage?.messageId === message.id ? 'Открепить' : 'Закрепить'}
                                </button>
                              )}
                              {isOutgoing && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleEditMessage(message)}
                                    className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-background-medium flex items-center gap-2 transition-colors"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMessage(message, true)}
                                    className="w-full px-3 py-2 text-left text-sm text-status-danger hover:bg-background-medium flex items-center gap-2 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-text-secondary rounded-full typing-dot" />
              <span className="w-2 h-2 bg-text-secondary rounded-full typing-dot" />
              <span className="w-2 h-2 bg-text-secondary rounded-full typing-dot" />
            </div>
            <span>печатает…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {replyingTo && (
        <div className="px-4 py-2 bg-background-medium border-t border-background-light flex items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text-secondary">Replying to {replyingTo.sender.displayName}</p>
            <p className="text-sm text-text-primary truncate">{replyingTo.content}</p>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="p-1 hover:bg-background-light rounded-full transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {editingMessage && (
        <div className="px-4 py-2 bg-background-medium border-t border-background-light flex items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary">Editing message</p>
            <p className="text-sm text-text-primary truncate">{editingMessage.content}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingMessage(null);
              setMessageInput('');
            }}
            className="p-1 hover:bg-background-light rounded-full transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      <div className="p-4 bg-background-medium border-t border-background-light shrink-0 relative z-30">
        {activeMention && mentionMembers.length > 0 && (
          <div
            className="absolute bottom-full left-0 right-0 mb-2 max-h-52 overflow-y-auto rounded-xl border border-background-light bg-background-medium shadow-2xl py-1"
            role="listbox"
            aria-label="Упоминания"
          >
            {mentionFiltered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-text-secondary">Нет совпадений</p>
            ) : (
              mentionFiltered.map((u, i) => (
                <button
                  key={u.id}
                  type="button"
                  role="option"
                  aria-selected={i === mentionPickIdx}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-tg-rowHover ${
                    i === mentionPickIdx ? 'bg-tg-rowActive' : ''
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickMention(u)}
                >
                  {mediaUrl(u.avatarUrl) ? (
                    <img src={mediaUrl(u.avatarUrl)} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/40 flex items-center justify-center text-xs font-semibold shrink-0">
                      {u.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="text-text-primary font-medium truncate block">{u.displayName}</span>
                    {u.username && (
                      <span className="text-xs text-text-secondary block truncate">@{u.username}</span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
        {pendingAttachments.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 -mx-1 px-1">
            {pendingAttachments.map((p) => {
              const isImg = p.file.type.startsWith('image/');
              const isVid = p.file.type.startsWith('video/');
              const isAud = p.file.type.startsWith('audio/');
              return (
                <div
                  key={p.id}
                  className="relative shrink-0 w-16 h-16 rounded-lg border border-background-light bg-background-light overflow-hidden group"
                >
                  {isImg ? (
                    <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                  ) : isVid ? (
                    <video
                      src={p.previewUrl}
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : isAud ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-background-dark p-0.5">
                      <Mic className="w-6 h-6 text-tg-link shrink-0" />
                      <span className="text-[9px] text-text-secondary truncate w-full text-center leading-tight mt-0.5">
                        {p.file.name.replace(/\.[^.]+$/, '') || 'audio'}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-1">
                      <File className="w-8 h-8 text-text-secondary" />
                    </div>
                  )}
                  <button
                    type="button"
                    className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-background-dark/80 text-text-primary opacity-90 hover:opacity-100"
                    onClick={() => removePendingAttachment(p.id)}
                    aria-label="Remove attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="relative flex-shrink-0" ref={attachMenuRef}>
            <button
              type="button"
              disabled={uploadBusy}
              onClick={() => {
                setShowEmojiPicker(false);
                setShowAttachMenu((v) => !v);
              }}
              className="p-2 hover:bg-background-light rounded-full transition-colors disabled:opacity-50"
              aria-label="Вложения"
              title="Вложения"
            >
              <Paperclip className="w-5 h-5 text-text-secondary" />
            </button>
            {showAttachMenu && (
              <div
                className="absolute bottom-full left-0 mb-2 w-56 rounded-xl border border-background-light bg-background-medium shadow-2xl z-50 py-1 animate-scale-in"
                role="menu"
              >
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-sm text-text-primary hover:bg-background-light flex items-center gap-2"
                  onClick={() => openFilePicker(attachInputRef)}
                >
                  <ImageIcon className="w-4 h-4 shrink-0 text-text-secondary" />
                  Фото или видео
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-sm text-text-primary hover:bg-background-light flex items-center gap-2"
                  onClick={() => openFilePicker(attachCameraRef)}
                >
                  <Camera className="w-4 h-4 shrink-0 text-text-secondary" />
                  Камера
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-sm text-text-primary hover:bg-background-light flex items-center gap-2"
                  onClick={() => openFilePicker(attachFileRef)}
                >
                  <FolderOpen className="w-4 h-4 shrink-0 text-text-secondary" />
                  Файл
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-sm text-text-primary hover:bg-background-light flex items-center gap-2"
                  onClick={() => {
                    setShowAttachMenu(false);
                    setToast('Геолокация будет доступна позже');
                  }}
                >
                  <MapPin className="w-4 h-4 shrink-0 text-text-secondary" />
                  Геолокация
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 relative min-w-0">
            <textarea
              ref={inputRef}
              value={messageInput}
              onChange={(e) => {
                const v = e.target.value;
                setMessageInput(v);
                setInputSel(e.target.selectionStart ?? v.length);
                if (v.length > 0) {
                  handleTypingStart();
                } else {
                  handleTypingStop();
                }
              }}
              onSelect={(e) => {
                setInputSel((e.target as HTMLTextAreaElement).selectionStart ?? 0);
              }}
              onClick={(e) => {
                setInputSel((e.target as HTMLTextAreaElement).selectionStart ?? 0);
              }}
              onKeyDown={(e) => {
                const cursor = inputRef.current?.selectionStart ?? messageInput.length;
                const m = parseActiveMention(messageInput, cursor);
                const filtered =
                  m && mentionMembers.length > 0
                    ? mentionMembers.filter(
                        (u) =>
                          u.displayName.toLowerCase().includes(m.query.toLowerCase()) ||
                          (u.username && u.username.toLowerCase().includes(m.query.toLowerCase()))
                      )
                    : [];
                if (m && filtered.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setMentionPickIdx((i) => Math.min(i + 1, filtered.length - 1));
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setMentionPickIdx((i) => Math.max(i - 1, 0));
                    return;
                  }
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const u = filtered[mentionPickIdx] ?? filtered[0];
                    if (u) pickMention(u);
                    return;
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    return;
                  }
                }
                if (e.key !== 'Enter' || e.shiftKey) return;
                e.preventDefault();
                if (uploadBusy) return;
                if (messageInput.trim() || editingMessage || pendingAttachments.length > 0) {
                  void handleSendMessage();
                }
              }}
              onBlur={handleTypingStop}
              placeholder="Сообщение"
              rows={1}
              className="w-full px-4 py-2.5 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary placeholder-text-secondary resize-none max-h-[7.5rem] transition-colors leading-6"
              style={{
                height: 'auto',
                minHeight: '42px',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                const maxScroll = 24 * 5;
                target.style.height = Math.min(target.scrollHeight, maxScroll) + 'px';
              }}
            />
          </div>

          <div className="relative flex-shrink-0">
            <button
              ref={emojiButtonRef}
              type="button"
              onClick={() => {
                setShowAttachMenu(false);
                setShowEmojiPicker((v) => !v);
              }}
              className="p-2 hover:bg-background-light rounded-full transition-colors"
              aria-label="Эмодзи"
              aria-expanded={showEmojiPicker}
            >
              <Smile className="w-5 h-5 text-text-secondary" />
            </button>
            <EmojiPicker
              open={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
              onPick={insertEmoji}
              anchorRef={emojiButtonRef}
            />
          </div>

          <button
            type="button"
            onClick={() => void handleSendOrVoice()}
            disabled={uploadBusy && !isRecording}
            className={`p-2.5 rounded-full transition-colors flex-shrink-0 ${
              isRecording
                ? 'bg-status-danger hover:opacity-90'
                : 'bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
            title={
              messageInput.trim() || editingMessage || pendingAttachments.length > 0
                ? 'Send'
                : isRecording
                  ? 'Stop and send'
                  : 'Record voice'
            }
            aria-label={
              messageInput.trim() || editingMessage || pendingAttachments.length > 0
                ? 'Send message'
                : isRecording
                  ? 'Stop recording'
                  : 'Record voice message'
            }
          >
            {messageInput.trim() || editingMessage || pendingAttachments.length > 0 ? (
              <Send className="w-5 h-5 text-white" />
            ) : isRecording ? (
              <Square className="w-5 h-5 text-white fill-current" />
            ) : (
              <Mic className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </div>

      {showThemeModal && chatId && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/55 p-4">
          <div
            className="w-full max-w-lg rounded-2xl bg-background-medium border border-background-light shadow-2xl overflow-hidden animate-scale-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-theme-title"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-background-light">
              <h2 id="chat-theme-title" className="font-semibold text-text-primary">
                Choose theme
              </h2>
              <button
                type="button"
                onClick={() => setShowThemeModal(false)}
                className="p-2 rounded-full hover:bg-background-light text-text-secondary"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto">
              {(Object.keys(CHAT_THEME_PRESETS) as ChatThemeId[]).map((id) => {
                const t = CHAT_THEME_PRESETS[id];
                const selected = chatThemeId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setChatTheme(chatId, id);
                      setShowThemeModal(false);
                      setToast('Theme applied');
                    }}
                    className={`rounded-xl border-2 p-3 text-left transition-colors ${
                      selected ? 'border-tg-link ring-2 ring-tg-link/40' : 'border-background-light hover:bg-background-light'
                    }`}
                  >
                    <div className="flex gap-1 mb-2 h-8 rounded overflow-hidden">
                      <div className="flex-1" style={{ background: t.outgoing }} />
                      <div className="flex-1" style={{ background: t.incoming }} />
                    </div>
                    <p className="text-sm text-text-primary font-medium">{t.name}</p>
                  </button>
                );
              })}
            </div>
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={() => {
                  setChatTheme(chatId, 'default');
                  setShowThemeModal(false);
                  setToast('Default theme');
                }}
                className="w-full py-2.5 text-tg-link text-sm font-medium hover:underline"
              >
                Reset to default
              </button>
            </div>
          </div>
        </div>
      )}

      {showChatInfo && currentChat && (
        <ChatInfoModal
          chat={currentChat}
          currentUserId={user?.id}
          onClose={() => setShowChatInfo(false)}
          onOpenProfile={(uid) => {
            setShowChatInfo(false);
            navigate(`/profile/${uid}`);
          }}
          onChatUpdated={(c) => {
            updateChat(c.id, c);
            void fetchChat(c.id);
          }}
        />
      )}
    </div>
  );
}
