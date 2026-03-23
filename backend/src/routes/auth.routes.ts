import { Router } from 'express';
import { prisma } from '../models/prisma.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.js';
import { toPublicUser } from '../utils/userPublic.js';
import {
  canSendCode,
  recordSend,
  verifyStoredCode,
} from '../utils/phoneCodeStore.js';

const router = Router();

function envFlagTrue(name: string, defaultTrue = true): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  if (v === undefined || v === '') return defaultTrue;
  return v === '1' || v === 'true' || v === 'yes';
}

function isValidPhoneFormat(phone: string): boolean {
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

// Send verification code (dev: code is logged and returned in JSON — no real SMS)
router.post('/send-code', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    if (!isValidPhoneFormat(phone)) {
      return res.status(400).json({
        error: 'Invalid phone format. Use international format with at least 10 digits.',
      });
    }

    if (!envFlagTrue('PHONE_SIGNUP_ENABLED', true)) {
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (!existing) {
        return res.status(403).json({
          error: 'Phone sign-up is disabled. Ask an admin for an account.',
        });
      }
    }

    const gate = canSendCode(phone);
    if (!gate.ok) {
      return res.status(429).json({
        error: 'Too many requests for this number. Try again later.',
        retryAfterSec: gate.retryAfterSec,
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    recordSend(phone, code);

    console.log(`[SMS demo] Verification code for ${phone}: ${code}`);

    res.json({
      success: true,
      message:
        'Demo mode: code is printed in the server log and returned in this response (no SMS).',
      code,
    });
  } catch (error) {
    console.error('Send code error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// Verify code and register/login (phone)
router.post('/verify', async (req, res) => {
  try {
    const { phone, code, displayName, username } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ error: 'Phone and code are required' });
    }

    if (!verifyStoredCode(phone, String(code))) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    let user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      if (!envFlagTrue('PHONE_SIGNUP_ENABLED', true)) {
        return res
          .status(403)
          .json({ error: 'Phone sign-up is disabled. Ask an admin for an account.' });
      }
      if (!displayName) {
        return res
          .status(400)
          .json({ error: 'Display name is required for new users' });
      }

      user = await prisma.user.create({
        data: {
          phone,
          displayName,
          username: username || null,
        },
      });
    }

    const tokens = generateTokens(user.id);

    res.json({
      success: true,
      user: toPublicUser(user),
      ...tokens,
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Login with email or username + password
router.post('/login', async (req, res) => {
  try {
    const { login, username, password } = req.body as {
      login?: string;
      username?: string;
      password?: string;
    };

    const identifier = (login ?? username ?? '').trim();
    if (!identifier || !password) {
      return res
        .status(400)
        .json({ error: 'login (email or username) and password are required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier.toLowerCase() }],
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await comparePassword(password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokens = generateTokens(user.id);

    res.json({
      success: true,
      user: toPublicUser(user),
      ...tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register: ТЗ — username + password + displayName; also email + password for tooling/e2e
router.post('/register', async (req, res) => {
  try {
    if (!envFlagTrue('PUBLIC_REGISTRATION', true)) {
      return res.status(403).json({
        error: 'Registration is disabled. Ask an admin for an account.',
      });
    }

    const body = req.body as {
      email?: string;
      password?: string;
      displayName?: string;
      username?: string | null;
    };

    const { email, password, displayName, username } = body;

    if (!password || !displayName) {
      return res.status(400).json({
        error:
          'password and displayName are required; provide either email or username (ТЗ)',
      });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters' });
    }

    const display = String(displayName).trim();
    if (!display) {
      return res.status(400).json({ error: 'Display name cannot be empty' });
    }

    // Email-based registration (e2e / convenience)
    if (email && String(email).trim()) {
      const emailNorm = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
        return res.status(400).json({ error: 'Invalid email address' });
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
        return res.status(409).json({ error: 'Email or username already taken' });
      }

      const passwordHash = await hashPassword(password);

      const user = await prisma.user.create({
        data: {
          email: emailNorm,
          passwordHash,
          displayName: display,
          username: usernameNorm || null,
        },
      });

      const tokens = generateTokens(user.id);

      return res.json({
        success: true,
        user: toPublicUser(user),
        ...tokens,
      });
    }

    // ТЗ: username + password + displayName (no email)
    const usernameRaw = String(username ?? '').trim().toLowerCase();
    const usernameNorm = usernameRaw.replace(/[^a-z0-9_]/g, '');
    if (!usernameNorm || usernameNorm.length < 5 || usernameNorm.length > 32) {
      return res.status(400).json({
        error:
          'username is required (5–32 chars, letters, digits, underscores only) or use email registration',
      });
    }

    if (!/^[a-z0-9_]+$/.test(usernameNorm)) {
      return res.status(400).json({ error: 'Invalid username characters' });
    }

    const taken = await prisma.user.findUnique({
      where: { username: usernameNorm },
    });
    if (taken) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username: usernameNorm,
        passwordHash,
        displayName: display,
      },
    });

    const tokens = generateTokens(user.id);

    res.json({
      success: true,
      user: toPublicUser(user),
      ...tokens,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token is required' });
    }

    const userId = verifyRefreshToken(refreshToken);

    if (!userId) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const tokens = generateTokens(user.id);

    res.json({
      success: true,
      ...tokens,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

router.post('/logout', (_req, res) => {
  res.json({ success: true });
});

export default router;
