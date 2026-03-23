import path from 'path';
import fs from 'fs';
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../models/prisma.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import type { AuthRequest } from '../middleware/auth.middleware.js';

const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || './uploads');

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
    cb(null, UPLOAD_ROOT);
  },
  filename: (req, file, cb) => {
    const id = (req as AuthRequest).userId!;
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)
      ? ext
      : '.jpg';
    cb(null, `avatar-${id}-${Date.now()}${safe}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const okExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    const mime = (file.mimetype || '').toLowerCase();
    const okMime =
      /^image\/(jpeg|pjpeg|png|gif|webp|x-png)$/i.test(mime) ||
      mime === 'image/jpg';
    if (okMime || (okExt && (!mime || mime === 'application/octet-stream'))) {
      cb(null, true);
      return;
    }
    cb(new Error('Only JPEG, PNG, GIF, WebP images are allowed'));
  },
});

const router = Router();

const meSelect = {
  id: true,
  email: true,
  phone: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  isOnline: true,
  isAdmin: true,
  lastSeenAt: true,
  createdAt: true,
} as const;

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: meSelect,
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

router.post(
  '/me/avatar',
  authenticateToken,
  (req, res, next) => {
    upload.single('avatar')(req, res, (err: unknown) => {
      if (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        return res.status(400).json({ error: msg });
      }
      next();
    });
  },
  async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const avatarUrl = `/uploads/${file.filename}`;
      const user = await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl },
        select: meSelect,
      });

      res.json(user);
    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({ error: 'Failed to save avatar' });
    }
  }
);

router.patch('/me', authenticateToken, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const { displayName, bio, avatarUrl, username } = req.body as {
      displayName?: string;
      bio?: string;
      avatarUrl?: string | null;
      username?: string | null;
    };

    const data: {
      displayName?: string;
      bio?: string | null;
      avatarUrl?: string | null;
      username?: string | null;
    } = {};

    if (typeof displayName === 'string') {
      const d = displayName.trim();
      if (!d) {
        return res.status(400).json({ error: 'Display name cannot be empty' });
      }
      data.displayName = d;
    }
    if (typeof bio === 'string') {
      data.bio = bio.slice(0, 70);
    }
    if (avatarUrl === null || typeof avatarUrl === 'string') {
      data.avatarUrl = avatarUrl ?? null;
    }
    if (username !== undefined) {
      if (username === null || username === '') {
        data.username = null;
      } else {
        const norm = String(username).toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!norm) {
          data.username = null;
        } else {
          const taken = await prisma.user.findFirst({
            where: { username: norm, NOT: { id: userId } },
          });
          if (taken) {
            return res.status(409).json({ error: 'Username already taken' });
          }
          data.username = norm;
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: meSelect,
    });

    res.json(user);
  } catch (error) {
    console.error('Update me error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/** Список пользователей для приглашений в чат (кроме текущего) */
router.get('/browse', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const users = await prisma.user.findMany({
      where: { id: { not: userId } },
      take: 80,
      orderBy: { displayName: 'asc' },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isOnline: true,
        lastSeenAt: true,
      },
    });
    res.json(users);
  } catch (error) {
    console.error('Browse users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// Search users
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } },
          {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { displayName: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isOnline: true,
        lastSeenAt: true,
      },
      take: 20,
    });

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        isOnline: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Get user's chats
router.get('/:id/chats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const chats = await prisma.chat.findMany({
      where: {
        members: {
          some: { userId: id },
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
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json(chats);
  } catch (error) {
    console.error('Get user chats error:', error);
    res.status(500).json({ error: 'Failed to get chats' });
  }
});

export default router;
