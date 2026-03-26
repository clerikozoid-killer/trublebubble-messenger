import { ContentType } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { prisma } from '../models/prisma.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { maybeReplyAsBubbleBot } from '../services/bubbleBotReply.js';
import { aggregateRecipientReceipt } from '../utils/messageReceipt.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export const setupSocketHandlers = (io: Server) => {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    const tokenFromAuth = socket.handshake.auth?.token;
    const tokenFromQuery = socket.handshake.query?.token;
    const token =
      typeof tokenFromAuth === 'string'
        ? tokenFromAuth
        : typeof tokenFromQuery === 'string'
          ? tokenFromQuery
          : Array.isArray(tokenFromQuery)
            ? tokenFromQuery[0]
            : undefined;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const userId = verifyAccessToken(token);

      if (!userId) {
        return next(new Error('Invalid token'));
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = userId;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;

    console.log(`User connected: ${userId}`);

    // Update user online status
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true, lastSeenAt: new Date() },
    });

    // Notify others about online status
    io.emit('user_online', { userId });

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Join chat rooms
    const memberships = await prisma.chatMember.findMany({
      where: { userId },
      select: { chatId: true },
    });

    memberships.forEach((m) => {
      socket.join(`chat:${m.chatId}`);
    });

    // Handle joining a chat
    socket.on('join_chat', async (chatId: string) => {
      const membership = await prisma.chatMember.findUnique({
        where: {
          chatId_userId: { chatId, userId },
        },
      });

      if (membership) {
        socket.join(`chat:${chatId}`);
        console.log(`User ${userId} joined chat ${chatId}`);
      }
    });

    // Handle leaving a chat
    socket.on('leave_chat', (chatId: string) => {
      socket.leave(`chat:${chatId}`);
      console.log(`User ${userId} left chat ${chatId}`);
    });

    // Handle sending messages
    socket.on('send_message', async (data: {
      chatId: string;
      content: string;
      contentType?: string;
      mediaUrl?: string;
      mediaSize?: number;
      replyToId?: string;
    }) => {
      try {
        const { chatId, content, contentType, mediaUrl, mediaSize, replyToId } = data;

        // Verify membership
        const membership = await prisma.chatMember.findUnique({
          where: {
            chatId_userId: { chatId, userId },
          },
        });

        if (!membership) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        socket.join(`chat:${chatId}`);

        const hasText = typeof content === 'string' && content.trim().length > 0;
        if (!hasText && !mediaUrl) {
          socket.emit('error', { message: 'Message content or media is required' });
          return;
        }

        // Create message
        const message = await prisma.message.create({
          data: {
            chatId,
            senderId: userId,
            content: content || null,
            contentType: (contentType ?? 'TEXT') as ContentType,
            mediaUrl: mediaUrl || null,
            mediaSize: mediaSize || null,
            replyToId: replyToId || null,
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            replyTo: {
              select: {
                id: true,
                content: true,
                contentType: true,
                sender: {
                  select: {
                    id: true,
                    displayName: true,
                  },
                },
              },
            },
          },
        });

        // Create message statuses
        const members = await prisma.chatMember.findMany({
          where: { chatId, userId: { not: userId } },
        });

        await prisma.messageStatus.createMany({
          data: members.map((m) => ({
            messageId: message.id,
            userId: m.userId,
            status: 'SENT',
          })),
        });

        // Update chat's updatedAt
        await prisma.chat.update({
          where: { id: chatId },
          data: { updatedAt: new Date() },
        });

        const full = await prisma.message.findUnique({
          where: { id: message.id },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            replyTo: {
              select: {
                id: true,
                content: true,
                contentType: true,
                sender: {
                  select: {
                    id: true,
                    displayName: true,
                  },
                },
              },
            },
            statuses: { select: { userId: true, status: true } },
          },
        });

        if (full) {
          io.to(`chat:${chatId}`).emit('new_message', full);
        }

        const textForBot =
          (typeof content === 'string' && content.trim()) ||
          (mediaUrl ? '[attachment]' : '');
        if (textForBot) {
          void maybeReplyAsBubbleBot(io, chatId, textForBot, userId, message.id);
        }

        members.forEach((m) => {
          io.to(`user:${m.userId}`).emit('message_sent', {
            messageId: message.id,
            chatId,
          });
        });

        socket.emit('message_delivered', {
          messageId: message.id,
          tempId: data.replyToId,
        });
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on(
      'ack_delivered',
      async (data: { chatId: string; messageId: string }) => {
        try {
          const { chatId, messageId } = data;
          if (!chatId || !messageId) return;

          const membership = await prisma.chatMember.findUnique({
            where: { chatId_userId: { chatId, userId } },
          });
          if (!membership) return;

          const msg = await prisma.message.findUnique({
            where: { id: messageId },
            select: { id: true, chatId: true, senderId: true },
          });
          if (!msg || msg.chatId !== chatId) return;

          await prisma.messageStatus.updateMany({
            where: {
              messageId,
              userId,
              status: 'SENT',
            },
            data: { status: 'DELIVERED', updatedAt: new Date() },
          });

          const rows = await prisma.messageStatus.findMany({
            where: { messageId },
            select: { userId: true, status: true },
          });
          const receiptStatus = aggregateRecipientReceipt(rows, msg.senderId);
          io.to(`user:${msg.senderId}`).emit('message_receipt', {
            messageId,
            chatId,
            receiptStatus,
          });
        } catch (e) {
          console.error('ack_delivered error:', e);
        }
      }
    );

    // Handle typing indicators
    socket.on('typing_start', (chatId: string) => {
      socket.to(`chat:${chatId}`).emit('typing', {
        chatId,
        userId,
        isTyping: true,
      });
    });

    socket.on('typing_stop', (chatId: string) => {
      socket.to(`chat:${chatId}`).emit('typing', {
        chatId,
        userId,
        isTyping: false,
      });
    });

    // Calls: только 1:1, запрет в группах/каналах
    const validatePrivateOneToOne = async (chatId: string) => {
      // Caller must be a member
      const membership = await prisma.chatMember.findUnique({
        where: { chatId_userId: { chatId, userId } },
      });
      if (!membership) return { allowed: false as const, reason: 'Access denied' };

      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        select: {
          type: true,
          members: { select: { userId: true } },
        },
      });

      if (!chat) return { allowed: false as const, reason: 'Chat not found' };
      if (chat.type !== 'PRIVATE') return { allowed: false as const, reason: 'Calls are allowed only in 1:1 private chats' };
      if (chat.members.length !== 2) return { allowed: false as const, reason: 'Calls require exactly 2 members' };
      return { allowed: true as const };
    };

    const getPeerUserIds = async (chatId: string) => {
      const members = await prisma.chatMember.findMany({
        where: { chatId },
        select: { userId: true },
      });
      return members.map((m) => m.userId).filter((id) => id !== userId);
    };

    socket.on(
      'call_offer',
      async (data: { chatId: string; callId: string; offer: unknown; callType: 'audio' | 'video' }) => {
        try {
          const { chatId, callId, offer, callType } = data;
          if (!chatId || !callId) return;
          const v = await validatePrivateOneToOne(chatId);
          console.log('[call] offer', { userId, chatId, callId, callType, allowed: v.allowed, reason: v.allowed ? undefined : v.reason });
          if (!v.allowed) {
            socket.emit('call_rejected', { chatId, callId, reason: v.reason });
            return;
          }
          // More reliable than chat-room fanout: send directly to peer user room(s).
          const peers = await getPeerUserIds(chatId);
          peers.forEach((peerId) => {
            io.to(`user:${peerId}`).emit('call_offer', {
              chatId,
              callId,
              offer,
              callType,
              fromUserId: userId,
            });
          });
        } catch (e) {
          console.error('call_offer error:', e);
        }
      }
    );

    socket.on(
      'call_answer',
      async (data: { chatId: string; callId: string; answer: unknown }) => {
        try {
          const { chatId, callId, answer } = data;
          if (!chatId || !callId) return;
          const v = await validatePrivateOneToOne(chatId);
          console.log('[call] answer', { userId, chatId, callId, allowed: v.allowed });
          if (!v.allowed) return;
          const peers = await getPeerUserIds(chatId);
          peers.forEach((peerId) => {
            io.to(`user:${peerId}`).emit('call_answer', {
              chatId,
              callId,
              answer,
              fromUserId: userId,
            });
          });
        } catch (e) {
          console.error('call_answer error:', e);
        }
      }
    );

    socket.on(
      'call_ice',
      async (data: { chatId: string; callId: string; candidate: unknown }) => {
        try {
          const { chatId, callId, candidate } = data;
          if (!chatId || !callId) return;
          const v = await validatePrivateOneToOne(chatId);
          const hasCandidate = Boolean(candidate);
          console.log('[call] ice', { userId, chatId, callId, hasCandidate, allowed: v.allowed });
          if (!v.allowed) return;
          const peers = await getPeerUserIds(chatId);
          peers.forEach((peerId) => {
            io.to(`user:${peerId}`).emit('call_ice', {
              chatId,
              callId,
              candidate,
              fromUserId: userId,
            });
          });
        } catch (e) {
          console.error('call_ice error:', e);
        }
      }
    );

    socket.on(
      'call_rejected',
      async (data: { chatId: string; callId: string; reason?: string }) => {
        try {
          const { chatId, callId, reason } = data;
          if (!chatId || !callId) return;
          const v = await validatePrivateOneToOne(chatId);
          console.log('[call] rejected', { userId, chatId, callId, allowed: v.allowed, reason });
          if (!v.allowed) return;
          const peers = await getPeerUserIds(chatId);
          peers.forEach((peerId) => {
            io.to(`user:${peerId}`).emit('call_rejected', {
              chatId,
              callId,
              reason,
              fromUserId: userId,
            });
          });
        } catch (e) {
          console.error('call_rejected error:', e);
        }
      }
    );

    socket.on('call_end', async (data: { chatId: string; callId: string }) => {
      try {
        const { chatId, callId } = data;
        if (!chatId || !callId) return;
        const v = await validatePrivateOneToOne(chatId);
        console.log('[call] end', { userId, chatId, callId, allowed: v.allowed });
        if (!v.allowed) return;
        const peers = await getPeerUserIds(chatId);
        peers.forEach((peerId) => {
          io.to(`user:${peerId}`).emit('call_end', { chatId, callId, fromUserId: userId });
        });
      } catch (e) {
        console.error('call_end error:', e);
      }
    });

    // Live transcripts for calls (client-side ASR). Forward to peer(s).
    socket.on(
      'call_transcript',
      async (data: { chatId: string; callId: string; text: string; lang?: string; final?: boolean }) => {
        try {
          const { chatId, callId, text, lang, final } = data;
          if (!chatId || !callId) return;
          if (!text || typeof text !== 'string' || !text.trim()) return;
          const v = await validatePrivateOneToOne(chatId);
          if (!v.allowed) return;
          const peers = await getPeerUserIds(chatId);
          peers.forEach((peerId) => {
            io.to(`user:${peerId}`).emit('call_transcript', {
              chatId,
              callId,
              text,
              lang: typeof lang === 'string' ? lang : undefined,
              final: Boolean(final),
              fromUserId: userId,
            });
          });
        } catch (e) {
          console.error('call_transcript error:', e);
        }
      }
    );

    // Handle marking messages as read
    socket.on('mark_read', async (data: { chatId: string; messageId?: string }) => {
      try {
        const { chatId, messageId } = data;

        // Verify membership
        const membership = await prisma.chatMember.findUnique({
          where: {
            chatId_userId: { chatId, userId },
          },
        });

        if (!membership) {
          return;
        }

        if (messageId) {
          await prisma.messageStatus.upsert({
            where: {
              messageId_userId: { messageId, userId },
            },
            update: { status: 'READ', updatedAt: new Date() },
            create: { messageId, userId, status: 'READ' },
          });

          const message = await prisma.message.findUnique({
            where: { id: messageId },
            select: { senderId: true },
          });

          if (message) {
            const rows = await prisma.messageStatus.findMany({
              where: { messageId },
              select: { userId: true, status: true },
            });
            const receiptStatus = aggregateRecipientReceipt(rows, message.senderId);
            io.to(`user:${message.senderId}`).emit('message_read', {
              messageId,
              userId,
              chatId,
            });
            io.to(`user:${message.senderId}`).emit('message_receipt', {
              messageId,
              chatId,
              receiptStatus,
            });
          }
        } else {
          // Mark all messages in chat as read
          await prisma.messageStatus.updateMany({
            where: {
              message: { chatId },
              userId,
              status: { not: 'READ' },
            },
            data: {
              status: 'READ',
              updatedAt: new Date(),
            },
          });

          // Notify chat about read receipt
          socket.to(`chat:${chatId}`).emit('chat_read', {
            chatId,
            userId,
          });
        }
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // Handle message editing
    socket.on('edit_message', async (data: { messageId: string; content: string }) => {
      try {
        const { messageId, content } = data;

        const message = await prisma.message.findUnique({
          where: { id: messageId },
        });

        if (!message || message.senderId !== userId) {
          socket.emit('error', { message: 'Cannot edit this message' });
          return;
        }

        // Check time limit (48 hours)
        const hoursSinceCreation = (Date.now() - message.createdAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceCreation > 48) {
          socket.emit('error', { message: 'Edit time limit exceeded' });
          return;
        }

        const updatedMessage = await prisma.message.update({
          where: { id: messageId },
          data: { content, isEdited: true },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        });

        io.to(`chat:${message.chatId}`).emit('message_edited', updatedMessage);
      } catch (error) {
        console.error('Edit message error:', error);
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    // Handle message deletion
    socket.on('delete_message', async (data: { messageId: string; deleteForEveryone: boolean }) => {
      try {
        const { messageId, deleteForEveryone } = data;

        const message = await prisma.message.findUnique({
          where: { id: messageId },
          include: { chat: { include: { members: true } } },
        });

        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        const membership = message.chat.members.find((m) => m.userId === userId);
        const isSender = message.senderId === userId;
        const isAdmin = membership?.role !== 'MEMBER';

        if (!membership || (!isSender && !isAdmin)) {
          socket.emit('error', { message: 'Permission denied' });
          return;
        }

        await prisma.message.update({
          where: { id: messageId },
          data: { isDeleted: true, content: 'This message was deleted' },
        });

        io.to(`chat:${message.chatId}`).emit('message_deleted', {
          messageId,
          chatId: message.chatId,
        });
      } catch (error) {
        console.error('Delete message error:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${userId}`);

      // Update user offline status
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: false, lastSeenAt: new Date() },
      });

      // Notify others about offline status
      io.emit('user_offline', { userId });
    });
  });
};
