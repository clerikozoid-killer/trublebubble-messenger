import { prisma } from './models/prisma.js';
import { hashPassword } from './utils/bcrypt.js';
import { BUBBLE_BOT_USERNAME } from './constants/bubbleBot.js';

const BOT_USERNAME = BUBBLE_BOT_USERNAME;
const BOT_DISPLAY = 'Bubble_Bot';
const DEFAULT_EMAIL = 'bubble_bot@local.trublebubble';
const DEFAULT_PASSWORD = 'BubbleBot_Test_1';

const DROPLET_AVATAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#FF2B5E"/>
      <stop offset="100%" stop-color="#B80033"/>
    </linearGradient>
  </defs>
  <path d="M50 6
           C36 24 22 40 22 58
           C22 77 35 92 50 92
           C65 92 78 77 78 58
           C78 40 64 24 50 6Z"
        fill="url(#g)"/>
  <path d="M50 18
           C40 32 32 44 32 56
           C32 69 40 80 50 80"
        fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="7" stroke-linecap="round"/>
</svg>
`.trim();

const DROPLET_AVATAR_URL = `data:image/svg+xml;utf8,${encodeURIComponent(DROPLET_AVATAR_SVG)}`;

/**
 * Test user for DM / group experiments. Login with username `bubble_bot` or email from env.
 * Enable with BUBBLE_BOT_SEED=1 (default: on when not explicitly disabled).
 */
export async function bootstrapBubbleBot(): Promise<void> {
  if (process.env.BUBBLE_BOT_SEED === '0' || process.env.BUBBLE_BOT_SEED === 'false') {
    return;
  }

  const email = (
    process.env.BUBBLE_BOT_EMAIL?.trim().toLowerCase() || DEFAULT_EMAIL
  );
  const password = process.env.BUBBLE_BOT_PASSWORD || DEFAULT_PASSWORD;

  const passwordHash = await hashPassword(password);

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username: BOT_USERNAME }, { email }] },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        displayName: BOT_DISPLAY,
        username: BOT_USERNAME,
        passwordHash,
        avatarUrl: DROPLET_AVATAR_URL,
        bio: 'Тестовый пользователь для личных чатов и групп. Логин: bubble_bot',
      },
    });
    console.log(`[bootstrapBubbleBot] Updated: ${BOT_USERNAME} (${email})`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      username: BOT_USERNAME,
      displayName: BOT_DISPLAY,
      passwordHash,
      avatarUrl: DROPLET_AVATAR_URL,
      bio: 'Тестовый пользователь для личных чатов и групп. Логин: bubble_bot',
    },
  });

  console.log(`[bootstrapBubbleBot] Created ${BOT_USERNAME} — email: ${email}`);
}
