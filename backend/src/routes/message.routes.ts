import path from 'path';
import fs from 'fs';
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../models/prisma.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { getIoServer } from '../ioServer.js';
import { maybeReplyAsBubbleBot } from '../services/bubbleBotReply.js';
import { aggregateRecipientReceipt } from '../utils/messageReceipt.js';
import { isObjectStorageConfigured, putPublicObject } from '../services/objectStorage.js';

const router = Router();

const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || './uploads');
const chatMediaStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
    cb(null, UPLOAD_ROOT);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const safe = /^\.[a-z0-9.]+$/i.test(ext) ? ext : '.bin';
    cb(null, `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safe}`);
  },
});

const chatMediaUploadDisk = multer({
  storage: chatMediaStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const chatMediaUploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Get messages for a chat
router.get('/chat/:chatId', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { chatId } = req.params;
    const { before, limit = 50 } = req.query;

    // Verify user is a member of the chat
    const membership = await prisma.chatMember.findUnique({
      where: {
        chatId_userId: { chatId, userId },
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const whereClause: any = {
      chatId,
      isDeleted: false,
    };

    if (before) {
      whereClause.createdAt = { lt: new Date(before as string) };
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
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
        statuses: {
          select: {
            userId: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });

    // Mark messages as read
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

    const ordered = messages.reverse().map((m) => ({
      ...m,
      receiptStatus:
        m.senderId === userId
          ? aggregateRecipientReceipt(m.statuses, m.senderId)
          : undefined,
    }));

    res.json(ordered);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Send a message
router.post('/chat/:chatId', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { chatId } = req.params;
    const { content, contentType, mediaUrl, mediaSize, replyToId } = req.body;

    if (!content && !mediaUrl) {
      return res.status(400).json({ error: 'Message content or media is required' });
    }

    // Verify user is a member of the chat
    const membership = await prisma.chatMember.findUnique({
      where: {
        chatId_userId: { chatId, userId },
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: userId,
        content: content || null,
        contentType: contentType || 'TEXT',
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

    // Update chat's updatedAt
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    // Status rows only for recipients (ТЗ)
    // Create statuses for other members
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

    const io = getIoServer();
    if (io && full) {
      io.to(`chat:${chatId}`).emit('new_message', full);
      const textForBot =
        (typeof content === 'string' && content.trim()) ||
        (mediaUrl ? '[attachment]' : '');
      if (textForBot) {
        void maybeReplyAsBubbleBot(io, chatId, textForBot, userId, message.id);
      }
    }

    if (!full) {
      return res.status(500).json({ error: 'Failed to load message' });
    }

    res.json({
      ...full,
      receiptStatus: aggregateRecipientReceipt(full.statuses, userId),
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Upload media for a chat message (returns URL for use with POST /chat/:id or socket)
router.post(
  '/chat/:chatId/upload',
  authenticateToken,
  (req, res, next) => {
    const m = isObjectStorageConfigured() ? chatMediaUploadMemory : chatMediaUploadDisk;
    m.single('file')(req, res, (err: unknown) => {
      if (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        return res.status(400).json({ error: msg });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { chatId } = req.params;
      const file = (req as { file?: Express.Multer.File }).file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const membership = await prisma.chatMember.findUnique({
        where: { chatId_userId: { chatId, userId } },
      });
      if (!membership) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const mime = (file.mimetype || '').toLowerCase();
      let contentType: 'IMAGE' | 'VIDEO' | 'FILE' | 'AUDIO' = 'FILE';
      if (mime.startsWith('image/')) contentType = 'IMAGE';
      else if (mime.startsWith('video/')) contentType = 'VIDEO';
      else if (mime.startsWith('audio/')) contentType = 'AUDIO';

      let mediaUrl: string;
      if (isObjectStorageConfigured()) {
        const ext = path.extname(file.originalname).toLowerCase() || '.bin';
        const safe = /^\.[a-z0-9.]+$/i.test(ext) ? ext : '.bin';
        const name = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safe}`;
        const buf = file.buffer;
        if (!buf) {
          return res.status(400).json({ error: 'No file data' });
        }
        const ct = file.mimetype || 'application/octet-stream';
        mediaUrl = await putPublicObject(`chat/${chatId}/${name}`, buf, ct);
      } else {
        mediaUrl = `/uploads/${file.filename}`;
      }

      res.json({
        mediaUrl,
        mediaSize: file.size,
        contentType,
        originalName: file.originalname,
      });
    } catch (error) {
      console.error('Chat media upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);

// Edit a message
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const message = await prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId !== userId) {
      return res.status(403).json({ error: 'Cannot edit another user\'s message' });
    }

    // Check if within edit time limit (48 hours)
    const hoursSinceCreation = (Date.now() - message.createdAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceCreation > 48) {
      return res.status(400).json({ error: 'Edit time limit (48 hours) exceeded' });
    }

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        content,
        isEdited: true,
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
      },
    });

    res.json(updatedMessage);
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// Delete a message
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { deleteForEveryone } = req.query;

    const message = await prisma.message.findUnique({
      where: { id },
      include: { chat: { include: { members: true } } },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const isSender = message.senderId === userId;
    const isChatMember = message.chat.members.some((m) => m.userId === userId);
    const isAdmin = message.chat.members.find((m) => m.userId === userId)?.role !== 'MEMBER';

    if (!isChatMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!isSender && !isAdmin) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    if (deleteForEveryone === 'true') {
      // Soft delete for everyone
      await prisma.message.update({
        where: { id },
        data: { isDeleted: true, content: 'This message was deleted' },
      });
    } else {
      // Soft delete for sender only (hide from sender's view)
      await prisma.message.update({
        where: { id },
        data: { isDeleted: true, content: 'This message was deleted' },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Mark messages as read
router.post('/chat/:chatId/read', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { chatId } = req.params;
    const { messageId } = req.body;

    // Verify user is a member
    const membership = await prisma.chatMember.findUnique({
      where: {
        chatId_userId: { chatId, userId },
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (messageId) {
      // Mark specific message as read
      await prisma.messageStatus.upsert({
        where: {
          messageId_userId: { messageId, userId },
        },
        update: { status: 'READ', updatedAt: new Date() },
        create: { messageId, userId, status: 'READ' },
      });
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
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Search messages
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { q, chatId } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const whereClause: any = {
      content: { contains: q, mode: 'insensitive' },
      isDeleted: false,
      chat: {
        members: {
          some: { userId },
        },
      },
    };

    if (chatId) {
      whereClause.chatId = chatId;
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        chat: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(messages);
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
