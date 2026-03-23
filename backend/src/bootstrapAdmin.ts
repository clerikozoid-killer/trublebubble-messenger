import { prisma } from './models/prisma.js';
import { hashPassword } from './utils/bcrypt.js';

/** Ensures ADMIN_EMAIL / ADMIN_PASSWORD from env exist as an admin account (for first-time setup). */
export async function bootstrapAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.warn('[bootstrapAdmin] ADMIN_EMAIL is not a valid email, skipping.');
    return;
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      displayName: 'Administrator',
      username: 'truble_admin',
      isAdmin: true,
    },
    update: {
      passwordHash,
      isAdmin: true,
    },
  });

  console.log(`[bootstrapAdmin] Admin user ready: ${email}`);

  /** If you already have an account (e.g. registered before ADMIN_EMAIL was set), promote this username. */
  const promoteUsername = process.env.ADMIN_PROMOTE_USERNAME?.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (promoteUsername) {
    const r = await prisma.user.updateMany({
      where: { username: promoteUsername },
      data: { isAdmin: true },
    });
    if (r.count > 0) {
      console.log(`[bootstrapAdmin] Promoted isAdmin for username "${promoteUsername}" (${r.count} row(s))`);
    }
  }
}
