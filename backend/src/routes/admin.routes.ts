import { Router } from 'express';
import { prisma } from '../models/prisma.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';
import { hashPassword } from '../utils/bcrypt.js';
import type { AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

router.post(
  '/users',
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { email, password, displayName, username, isAdmin: grantAdmin } =
        req.body as {
          email?: string;
          password?: string;
          displayName?: string;
          username?: string | null;
          isAdmin?: boolean;
        };

      if (!email || !password || !displayName) {
        return res
          .status(400)
          .json({ error: 'email, password, and displayName are required' });
      }

      const emailNorm = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
        return res.status(400).json({ error: 'Invalid email' });
      }

      const usernameNorm = username
        ? String(username).trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
        : null;

      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { email: emailNorm },
            ...(usernameNorm ? [{ username: usernameNorm }] : []),
          ],
        },
      });

      if (existing) {
        return res.status(409).json({ error: 'Email or username already in use' });
      }

      const passwordHash = await hashPassword(password);

      const user = await prisma.user.create({
        data: {
          email: emailNorm,
          passwordHash,
          displayName: String(displayName).trim(),
          username: usernameNorm,
          isAdmin: Boolean(grantAdmin),
        },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          isAdmin: true,
          createdAt: true,
        },
      });

      res.status(201).json({ success: true, user });
    } catch (error) {
      console.error('Admin create user error:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
);

router.get(
  '/users',
  authenticateToken,
  requireAdmin,
  async (_req: AuthRequest, res) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          isAdmin: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      res.json(users);
    } catch (error) {
      console.error('Admin list users error:', error);
      res.status(500).json({ error: 'Failed to list users' });
    }
  }
);

export default router;
