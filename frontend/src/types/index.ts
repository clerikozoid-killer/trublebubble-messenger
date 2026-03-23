export interface User {
  id: string;
  email?: string | null;
  phone?: string;
  username?: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  isOnline: boolean;
  isAdmin?: boolean;
  lastSeenAt?: string;
  createdAt?: string;
}

export interface Chat {
  id: string;
  type: 'PRIVATE' | 'GROUP' | 'CHANNEL' | 'SUPERGROUP';
  title?: string;
  avatarUrl?: string;
  description?: string;
  username?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  members: ChatMember[];
  messages?: Message[];
  unreadCount?: number;
}

export interface ChatMember {
  chatId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
  user: User;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content?: string;
  contentType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'AUDIO' | 'VOICE';
  mediaUrl?: string;
  mediaSize?: number;
  replyToId?: string;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  sender: User;
  replyTo?: Message;
  statuses?: MessageStatus[];
  /** Set by API for the sender's messages; otherwise derive via aggregateRecipientReceipt */
  receiptStatus?: 'SENT' | 'DELIVERED' | 'READ';
}

export interface MessageStatus {
  messageId?: string;
  userId: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ApiError {
  error: string;
}
