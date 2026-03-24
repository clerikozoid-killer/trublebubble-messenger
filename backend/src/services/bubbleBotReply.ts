import fs from 'fs';
import path from 'path';
import { fetch as undiciFetch, ProxyAgent } from 'undici';
import type { Server } from 'socket.io';
import { prisma } from '../models/prisma.js';
import { BUBBLE_BOT_USERNAME } from '../constants/bubbleBot.js';

function resolvePromptPath(): string {
  const fromEnv = process.env.BUBBLE_BOT_PROMPT_PATH?.trim();
  if (fromEnv) return path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
  const candidates = [
    path.join(process.cwd(), 'bubble-bot-prompt.txt'),
    path.resolve(process.cwd(), '..', 'bubble-bot-prompt.txt'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

function loadSystemPrompt(): string {
  try {
    const p = resolvePromptPath();
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf-8').trim() || defaultPrompt();
    }
  } catch (e) {
    console.warn('[bubbleBot] Could not read prompt file:', e);
  }
  return defaultPrompt();
}

function defaultPrompt(): string {
  return 'You are Bubble_Bot, a short and friendly demo assistant in TrubleBubble.';
}

/**
 * Собирает URL и заголовки для Gemini REST.
 * GEMINI_BASE_URL — зеркало/прокси (например https://api.genai.gd.edu.kg/google для доступа без VPN из РФ).
 * GEMINI_API_KEY_IN_HEADER=true — ключ только в x-goog-api-key (удобно для прокси, которые не принимают ?key=).
 */
function buildGeminiRequest(model: string): { url: string; headers: Record<string, string> } {
  const base = (
    process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com'
  ).replace(/\/$/, '');
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error('GEMINI_API_KEY missing');
  const apiVersion = (process.env.GEMINI_API_VERSION || 'v1beta').replace(/^\/+|\/+$/g, '');
  const suffix = `/models/${encodeURIComponent(model)}:generateContent`;
  const path = `/${apiVersion}${suffix}`;
  const headerKey =
    process.env.GEMINI_API_KEY_IN_HEADER === '1' ||
    process.env.GEMINI_API_KEY_IN_HEADER === 'true' ||
    process.env.GEMINI_API_KEY_IN_HEADER === 'yes';
  const url = headerKey ? `${base}${path}` : `${base}${path}?key=${encodeURIComponent(key)}`;
  const headers: Record<string, string> = {};
  if (headerKey) {
    headers['x-goog-api-key'] = key;
  }
  return { url, headers };
}

/** Исходящий HTTP(S) прокси для fetch (если зеркало недоступно напрямую). GEMINI_HTTPS_PROXY или HTTPS_PROXY. */
async function fetchWithOptionalProxy(url: string, init: RequestInit): Promise<Response> {
  const proxy =
    process.env.GEMINI_HTTPS_PROXY?.trim() ||
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim();
  if (!proxy) {
    return fetch(url, init);
  }
  const agent = new ProxyAgent(proxy);
  return undiciFetch(url, {
    ...init,
    dispatcher: agent,
  } as Parameters<typeof undiciFetch>[1]);
}

/** Prefer env model, then common IDs (names change on Google’s side). Skip IDs that 404 on v1beta generateContent (e.g. gemini-1.5-flash-8b). */
function geminiModelCandidates(): string[] {
  const envModel = process.env.GEMINI_MODEL?.trim();
  const list = [
    envModel,
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
  ].filter((m): m is string => Boolean(m));
  return [...new Set(list)];
}

/** Two payload shapes: some mirrors reject `systemInstruction` and return 400 — then merged single prompt works. */
function geminiRequestBodies(systemPrompt: string, userMessage: string) {
  const generationConfig = { temperature: 0.7, maxOutputTokens: 1024 };
  const withSystem = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userMessage }] }],
    generationConfig,
  };
  const merged = {
    contents: [
      {
        parts: [
          {
            text: `Instructions:\n${systemPrompt}\n\nUser message:\n${userMessage}`,
          },
        ],
      },
    ],
    generationConfig,
  };
  return [withSystem, merged] as const;
}

type GeminiJson = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string; code?: number };
};

function textFromGeminiJson(data: GeminiJson, raw: string, model: string): string | null {
  if (data.error?.message) {
    console.error('[bubbleBot] Gemini API error field:', data.error);
    return null;
  }
  const cand = data.candidates?.[0];
  const reason = cand?.finishReason;
  if (reason === 'SAFETY' || reason === 'BLOCKLIST' || reason === 'PROHIBITED_CONTENT') {
    return 'Не могу ответить по правилам безопасности модели. Перефразируйте, пожалуйста.';
  }
  const parts = cand?.content?.parts;
  const text = parts?.map((p) => p.text ?? '').join('').trim();
  if (text) return text;
  console.warn('[bubbleBot] Gemini empty reply:', model, reason, raw.slice(0, 400));
  return null;
}

async function completeWithGemini(
  userMessage: string,
  systemPrompt: string
): Promise<string> {
  let lastLog = '';
  const bodies = geminiRequestBodies(systemPrompt, userMessage);

  for (const model of geminiModelCandidates()) {
    const { url, headers: geminiHeaders } = buildGeminiRequest(model);

    for (let bi = 0; bi < bodies.length; bi++) {
      const body = bodies[bi];
      let res: Response;
      try {
        res = await fetchWithOptionalProxy(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...geminiHeaders,
          },
          body: JSON.stringify(body),
        });
      } catch (e) {
        lastLog = `${model}: network ${String(e)}`;
        console.error('[bubbleBot] Gemini fetch failed:', lastLog);
        break;
      }

      const raw = await res.text().catch(() => '');
      if (!res.ok) {
        lastLog = `${model}: HTTP ${res.status} ${raw.slice(0, 500)}`;
        console.error('[bubbleBot] Gemini error:', lastLog);
        continue;
      }

      let data: GeminiJson;
      try {
        data = JSON.parse(raw) as GeminiJson;
      } catch {
        lastLog = `${model}: invalid JSON`;
        console.error('[bubbleBot] Gemini invalid JSON:', raw.slice(0, 300));
        continue;
      }

      const text = textFromGeminiJson(data, raw, model);
      if (text) return text;
      lastLog = `${model}: empty or unusable response (body variant ${bi + 1})`;
    }
  }

  console.error('[bubbleBot] All Gemini models failed. Last detail:', lastLog);
  return (
    'Извините, сейчас не могу ответить (ошибка Gemini). Проверьте на сервере: логи Render (строки [bubbleBot] Gemini), ' +
    'ключ GEMINI_API_KEY, при зеркале — GEMINI_BASE_URL и GEMINI_API_KEY_IN_HEADER=true, модель GEMINI_MODEL. ' +
    'Либо задайте OPENAI_API_KEY. Попробуйте позже.'
  );
}

async function completeWithOpenAI(
  userMessage: string,
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 400,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[bubbleBot] OpenAI error:', res.status, errText);
    return 'Извините, сейчас не могу ответить (ошибка ИИ). Попробуйте позже.';
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  return text || '…';
}

async function completeChat(userMessage: string): Promise<string> {
  const systemPrompt = loadSystemPrompt();

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  if (geminiKey) {
    try {
      return await completeWithGemini(userMessage, systemPrompt);
    } catch (e) {
      console.error('[bubbleBot] Gemini call failed:', e);
      return 'Извините, не удалось обратиться к Gemini. Проверьте GEMINI_API_KEY и GEMINI_MODEL в .env.';
    }
  }

  if (openaiKey) {
    return completeWithOpenAI(userMessage, systemPrompt, openaiKey);
  }

  console.warn('[bubbleBot] Set GEMINI_API_KEY or OPENAI_API_KEY in .env — using fallback reply');
  return `Привет! Я Bubble_Bot. Чтобы я отвечал через ИИ, на сервере бэкенда (локально — в backend/.env, на Render — в Environment) задайте GEMINI_API_KEY или OPENAI_API_KEY. При необходимости укажите GEMINI_BASE_URL (зеркало). Ваше сообщение: «${userMessage.slice(0, 200)}»`;
}

/**
 * After a human sends a message in a DM with Bubble_Bot, generate and broadcast a bot reply.
 */
export async function maybeReplyAsBubbleBot(
  io: Server,
  chatId: string,
  userMessageText: string,
  senderId: string
): Promise<void> {
  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: { include: { user: true } },
      },
    });

    if (!chat || chat.type !== 'PRIVATE') return;

    const bot = await prisma.user.findUnique({
      where: { username: BUBBLE_BOT_USERNAME },
    });
    if (!bot) return;

    const botMember = chat.members.find((m) => m.userId === bot.id);
    if (!botMember) return;
    if (senderId === bot.id) return;

    const text = await completeChat(userMessageText);

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: bot.id,
        content: text,
        contentType: 'TEXT',
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

    const others = await prisma.chatMember.findMany({
      where: { chatId, userId: { not: bot.id } },
    });

    await prisma.messageStatus.createMany({
      data: others.map((m) => ({
        messageId: message.id,
        userId: m.userId,
        status: 'SENT' as const,
      })),
    });

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
  } catch (e) {
    console.error('[bubbleBot] maybeReplyAsBubbleBot failed:', e);
  }
}
