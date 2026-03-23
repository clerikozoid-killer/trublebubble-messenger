import { Router } from 'express';
import { prisma } from '../models/prisma.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { getIoServer } from '../ioServer.js';

const router = Router();

// Get all chats for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;

    const chats = await prisma.chat.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isOnline: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            contentType: true,
            createdAt: true,
            senderId: true,
            isEdited: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Get unread counts for each chat
    const chatsWithUnread = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await prisma.message.count({
          where: {
            chatId: chat.id,
            senderId: { not: userId },
            isDeleted: false,
            NOT: {
              statuses: {
                some: {
                  userId,
                  status: 'READ',
                },
              },
            },
          },
        });

        return {
          ...chat,
          unreadCount,
        };
      })
    );

    res.json(chatsWithUnread);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: 'Failed to get chats' });
  }
});

// Create a new chat (private or group)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { type, title, memberIds, username } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Chat type is required' });
    }

    // For private chats, only one member besides self
    if (type === 'PRIVATE') {
      if (!memberIds || memberIds.length === 0) {
        return res.status(400).json({ error: 'Member ID is required for private chat' });
      }

      // Check if chat already exists
      const existingChat = await prisma.chat.findFirst({
        where: {
          type: 'PRIVATE',
          AND: [
            { members: { some: { userId } } },
            { members: { some: { userId: memberIds[0] } } },
          ],
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                  isOnline: true,
                },
              },
            },
          },
        },
      });

      if (existingChat) {
        return res.json(existingChat);
      }

      const chat = await prisma.chat.create({
        data: {
          type: 'PRIVATE',
          createdById: userId,
          members: {
            create: [
              { userId, role: 'MEMBER' },
              { userId: memberIds[0], role: 'MEMBER' },
            ],
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                  isOnline: true,
                },
              },
            },
          },
        },
      });

      return res.json(chat);
    }

    // For group chats
    if (type === 'GROUP' || type === 'SUPERGROUP') {
      if (!title) {
        return res.status(400).json({ error: 'Title is required for group chat' });
      }

      const memberIdsArray = memberIds || [];

      const chat = await prisma.chat.create({
        data: {
          type,
          title,
          username: username || null,
          createdById: userId,
          members: {
            create: [
              { userId, role: 'OWNER' },
              ...memberIdsArray.map((id: string) => ({ userId: id, role: 'MEMBER' as const })),
            ],
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                  isOnline: true,
                },
              },
            },
          },
        },
      });

      return res.json(chat);
    }

    // For channels
    if (type === 'CHANNEL') {
      if (!title) {
        return res.status(400).json({ error: 'Title is required for channel' });
      }

      const chat = await prisma.chat.create({
        data: {
          type,
          title,
          username: username || null,
          description: req.body.description || null,
          createdById: userId,
          members: {
            create: [{ userId, role: 'OWNER' }],
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                  isOnline: true,
                },
              },
            },
          },
        },
      });

      return res.json(chat);
    }

    res.status(400).json({ error: 'Invalid chat type' });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

// Get chat by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isOnline: true,
                lastSeenAt: true,
              },
            },
          },
        },
      },
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Check if user is a member
    const isMember = chat.members.some((m) => m.userId === userId);

    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(chat);
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: 'Failed to get chat' });
  }
});

// Update chat
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { title, description, avatarUrl, username } = req.body as {
      title?: string;
      description?: string | null;
      avatarUrl?: string | null;
      username?: string | null;
    };

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Check if user is owner or admin
    const membership = chat.members.find((m) => m.userId === userId);

    if (!membership || membership.role === 'MEMBER') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const data: {
      title?: string;
      description?: string | null;
      avatarUrl?: string | null;
      username?: string | null;
    } = {};
    if (typeof title === 'string') data.title = title;
    if (description === null || typeof description === 'string') data.description = description;
    if (avatarUrl === null || typeof avatarUrl === 'string') data.avatarUrl = avatarUrl;
    if (username === null || typeof username === 'string') data.username = username;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updatedChat = await prisma.chat.update({
      where: { id },
      data,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isOnline: true,
              },
            },
          },
        },
      },
    });

    res.json(updatedChat);
  } catch (error) {
    console.error('Update chat error:', error);
    res.status(500).json({ error: 'Failed to update chat' });
  }
});

// Clear all messages in chat (Telegram-style; all members see empty history)
router.post('/:id/clear-history', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const membership = chat.members.find((m) => m.userId === userId);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const canClear =
      chat.type === 'PRIVATE' ||
      membership.role === 'OWNER' ||
      membership.role === 'ADMIN';

    if (!canClear) {
      return res.status(403).json({ error: 'Only admins can clear group history' });
    }

    await prisma.message.deleteMany({ where: { chatId: id } });
    await prisma.chat.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    const io = getIoServer();
    io?.to(`chat:${id}`).emit('chat_cleared', { chatId: id });

    res.json({ success: true });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

// Delete chat
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const membership = chat.members.find((m) => m.userId === userId);
    const isOwnerRole = membership?.role === 'OWNER';
    const isPrivateCreator =
      chat.type === 'PRIVATE' && chat.createdById === userId;
    if (!isOwnerRole && !isPrivateCreator) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await prisma.chat.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

// Add member to chat
router.post('/:id/members', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Check permission
    const membership = chat.members.find((m) => m.userId === userId);

    if (!membership || membership.role === 'MEMBER') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Add members
    await prisma.chatMember.createMany({
      data: userIds.map((newUserId: string) => ({
        chatId: id,
        userId: newUserId,
        role: 'MEMBER',
      })),
      skipDuplicates: true,
    });

    const updatedChat = await prisma.chat.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isOnline: true,
              },
            },
          },
        },
      },
    });

    res.json(updatedChat);
  } catch (error) {
    console.error('Add members error:', error);
    res.status(500).json({ error: 'Failed to add members' });
  }
});

// Remove member from chat
router.delete('/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    const currentUserId = (req as any).userId;
    const { id, userId } = req.params;

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Check permission (can remove self or if admin/owner)
    const currentMembership = chat.members.find((m) => m.userId === currentUserId);
    const targetMembership = chat.members.find((m) => m.userId === userId);

    if (!currentMembership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (userId !== currentUserId && currentMembership.role === 'MEMBER') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    if (targetMembership?.role === 'OWNER') {
      return res.status(403).json({ error: 'Cannot remove owner' });
    }

    await prisma.chatMember.delete({
      where: {
        chatId_userId: { chatId: id, userId },
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Leave chat
router.post('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const membership = chat.members.find((m) => m.userId === userId);

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this chat' });
    }

    if (membership.role === 'OWNER') {
      return res.status(400).json({ error: 'Owner cannot leave. Transfer ownership or delete the chat.' });
    }

    await prisma.chatMember.delete({
      where: {
        chatId_userId: { chatId: id, userId },
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Leave chat error:', error);
    res.status(500).json({ error: 'Failed to leave chat' });
  }
});

export default router;
