import { prisma } from './models/prisma.js';
import { hashPassword } from './utils/bcrypt.js';
import { BUBBLE_BOT_USERNAME } from './constants/bubbleBot.js';

const BOT_USERNAME = BUBBLE_BOT_USERNAME;
const BOT_DISPLAY = 'Bubble_Bot';
const DEFAULT_EMAIL = 'bubble_bot@local.trublebubble';
const DEFAULT_PASSWORD = 'BubbleBot_Test_1';

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
      bio: 'Тестовый пользователь для личных чатов и групп. Логин: bubble_bot',
    },
  });

  console.log(`[bootstrapBubbleBot] Created ${BOT_USERNAME} — email: ${email}`);
}
