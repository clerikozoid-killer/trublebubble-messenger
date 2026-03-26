import fs from 'fs';
import path from 'path';
import { fetch as undiciFetch, ProxyAgent } from 'undici';
import type { Server } from 'socket.io';
import { prisma } from '../models/prisma.js';
import { BUBBLE_BOT_USERNAME } from '../constants/bubbleBot.js';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Plain-text @username mention (matches how the client inserts mentions). */
function messageMentionsUser(text: string, username: string): boolean {
  const re = new RegExp(`@${escapeRegExp(username)}\\b`, 'i');
  return re.test(text);
}

/** Remove @bubble_bot from the prompt so the model sees the actual question. */
function stripUsernameMention(text: string, username: string): string {
  const re = new RegExp(`@${escapeRegExp(username)}\\b`, 'gi');
  const cleaned = text.replace(re, ' ').replace(/\s+/g, ' ').trim();
  return cleaned || text.trim();
}

function normalizeForContext(content: string, contentType: string): string {
  const t = (content || '').trim();
  if (!t) return '';
  if (t.startsWith('{')) {
    // Hide internal stubs like {"kind":"poll","pollId":"..."}
    try {
      const parsed = JSON.parse(t) as { kind?: unknown };
      if (parsed?.kind === 'poll') return '[Опрос]';
      if (parsed?.kind === 'location') return '[Геолокация]';
    } catch {
      // ignore
    }
  }
  if (contentType && contentType !== 'TEXT') {
    return `[${contentType}] ${t}`.trim();
  }
  return t;
}

async function buildChatContext(
  chatId: string,
  botId: string,
  anchorMessageId?: string,
  maxMessages = 18
): Promise<string> {
  if (!anchorMessageId) {
    // Fallback: last messages (excluding empty stubs).
    const msgs = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
      take: maxMessages,
      select: {
        id: true,
        content: true,
        contentType: true,
        sender: { select: { username: true, displayName: true } },
      },
    });
    return msgs
      .reverse()
      .map((m) => {
        const who = m.sender?.displayName || m.sender?.username || 'user';
        const text = normalizeForContext(m.content ?? '', m.contentType ?? 'TEXT');
        if (!text) return null;
        return `${who}: ${text}`;
      })
      .filter((x): x is string => Boolean(x))
      .join('\n');
  }

  const anchor = await prisma.message.findUnique({
    where: { id: anchorMessageId },
    select: {
      id: true,
      createdAt: true,
      replyToId: true,
      content: true,
      contentType: true,
      sender: { select: { username: true, displayName: true } },
    },
  });
  if (!anchor) return '';

  const lastBotBeforeAnchor = await prisma.message.findFirst({
    where: {
      chatId,
      senderId: botId,
      createdAt: { lt: anchor.createdAt },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, createdAt: true },
  });

  // 1) Prefer "reply chain" branch: follow replyToId links until we hit last bot message.
  const visited = new Set<string>();
  const chain: Array<{
    id: string;
    senderDisplay: string;
    content: string | null;
    contentType: string;
  }> = [];

  let curId: string | null = anchorMessageId;
  let steps = 0;
  while (curId && steps < 12 && !visited.has(curId)) {
    visited.add(curId);
    const msg = (await prisma.message.findUnique({
      where: { id: curId },
      select: {
        id: true,
        replyToId: true,
        content: true,
        contentType: true,
        sender: { select: { username: true, displayName: true } },
      },
    })) as
      | {
          id: string;
          replyToId: string | null;
          content: string | null;
          contentType: string;
          sender: { username: string | null; displayName: string | null } | null;
        }
      | null;
    if (!msg) break;

    chain.push({
      id: msg.id,
      senderDisplay: msg.sender?.displayName || msg.sender?.username || 'user',
      content: msg.content ?? null,
      contentType: msg.contentType ?? 'TEXT',
    });

    if (lastBotBeforeAnchor && msg.id === lastBotBeforeAnchor.id) break;
    curId = msg.replyToId;
    steps++;
  }

  const chainIds = new Set(chain.map((c) => c.id));
  const reachedLastBot = lastBotBeforeAnchor ? chainIds.has(lastBotBeforeAnchor.id) : false;

  // context must exclude the anchor itself (it is provided separately as "Текущее сообщение пользователя")
  const makeLines = (msgs: typeof chain) =>
    msgs
      .filter((lineMsg) => lineMsg.id !== anchorMessageId)
      .map((lineMsg) => {
        const text = normalizeForContext(lineMsg.content ?? '', lineMsg.contentType ?? 'TEXT');
        if (!text) return null;
        return `${lineMsg.senderDisplay}: ${text}`;
      })
      .filter((x): x is string => Boolean(x))
      .slice(-maxMessages)
      .join('\n');

  if (reachedLastBot) {
    // chain is [anchor -> ... -> lastBot]; reverse to chronological order.
    return makeLines(chain.slice().reverse());
  }

  // 2) Fallback to time-window between last bot and the anchor (still excludes anchor).
  if (lastBotBeforeAnchor) {
    const msgs = await prisma.message.findMany({
      where: {
        chatId,
        createdAt: { gte: lastBotBeforeAnchor.createdAt, lt: anchor.createdAt },
      },
      orderBy: { createdAt: 'asc' },
      take: maxMessages + 4,
      select: {
        id: true,
        content: true,
        contentType: true,
        sender: { select: { username: true, displayName: true } },
      },
    });

    return msgs
      .map((m) => {
        const who = m.sender?.displayName || m.sender?.username || 'user';
        const text = normalizeForContext(m.content ?? '', m.contentType ?? 'TEXT');
        if (!text) return null;
        return `${who}: ${text}`;
      })
      .filter((x): x is string => Boolean(x))
      .slice(-maxMessages)
      .join('\n');
  }

  // 3) Final fallback: last messages overall excluding anchor.
  const msgs = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: 'desc' },
    take: maxMessages + 6,
    select: {
      id: true,
      content: true,
      contentType: true,
      sender: { select: { username: true, displayName: true } },
    },
  });

  return msgs
    .reverse()
    .filter((m) => m.id !== anchorMessageId)
    .map((m) => {
      const who = m.sender?.displayName || m.sender?.username || 'user';
      const text = normalizeForContext(m.content ?? '', m.contentType ?? 'TEXT');
      if (!text) return null;
      return `${who}: ${text}`;
    })
    .filter((x): x is string => Boolean(x))
    .slice(-maxMessages)
    .join('\n');
}

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

/**
 * Prefer GEMINI_MODEL, then stable IDs that exist on generativelanguage.googleapis.com.
 * Do not use bare `gemini-1.5-pro` / `gemini-1.5-flash` — Google returns 404 NOT_FOUND for unversioned 1.5 names on v1beta.
 * @see https://ai.google.dev/gemini-api/docs/models/gemini
 */
function geminiModelCandidates(): string[] {
  const envModel = process.env.GEMINI_MODEL?.trim();
  const list = [
    envModel,
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash-001',
    'gemini-1.5-pro-002',
    'gemini-1.5-pro-latest',
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
        if (res.status === 429) {
          throw new Error('GEMINI_QUOTA');
        }
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

const DEFAULT_OPENAI_BASE = 'https://api.openai.com/v1';

/** OpenAI-compatible Chat Completions (Minimax, OpenAI, Azure, etc.). */
async function callOpenAIChat(
  userMessage: string,
  systemPrompt: string,
  apiKey: string,
  baseUrl: string,
  model: string
): Promise<{ ok: true; text: string } | { ok: false; quota: boolean }> {
  const base = baseUrl.replace(/\/$/, '');
  const res = await fetch(`${base}/chat/completions`, {
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
    console.error('[bubbleBot] OpenAI-compatible error:', res.status, errText.slice(0, 500));
    if (res.status === 429 || res.status === 402) return { ok: false, quota: true };
    return { ok: false, quota: false };
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (text) return { ok: true, text };
  return { ok: false, quota: false };
}

function normalizeOpenAIBase(url: string): string {
  return url.replace(/\/$/, '');
}

/**
 * Order:
 * 1) If OPENAI_BASE_URL is not the default api.openai.com — treat as Minimax / custom OpenAI-compatible first (OPENAI_API_KEY).
 * 2) On HTTP 429/402 — OPENAI_FALLBACK_API_KEY against DEFAULT_OPENAI_BASE (OpenAI proper).
 * 3) Gemini if GEMINI_API_KEY (after primary chain did not return).
 * 4) If only official OpenAI (no custom OPENAI_BASE_URL) — single OPENAI_API_KEY @ DEFAULT_OPENAI_BASE.
 */
async function completeChat(userMessage: string): Promise<string> {
  const systemPrompt = loadSystemPrompt();

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const openaiFallbackKey = process.env.OPENAI_FALLBACK_API_KEY?.trim();

  const configuredBase = process.env.OPENAI_BASE_URL?.trim();
  const primaryBase = normalizeOpenAIBase(configuredBase || DEFAULT_OPENAI_BASE);
  const isCustomOpenAIBase =
    Boolean(openaiKey) &&
    Boolean(configuredBase) &&
    primaryBase !== normalizeOpenAIBase(DEFAULT_OPENAI_BASE);

  const primaryModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const fallbackModel = process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o-mini';

  let customPrimaryFailedNonQuota = false;

  // 1–2) Minimax (or any non-default OpenAI-compatible) → OpenAI official on quota
  if (isCustomOpenAIBase && openaiKey) {
    const r1 = await callOpenAIChat(
      userMessage,
      systemPrompt,
      openaiKey,
      primaryBase,
      primaryModel
    );
    if (r1.ok) return r1.text;

    if (r1.quota && openaiFallbackKey) {
      console.warn('[bubbleBot] Primary OpenAI-compatible quota — trying OpenAI (fallback key)');
      const r2 = await callOpenAIChat(
        userMessage,
        systemPrompt,
        openaiFallbackKey,
        DEFAULT_OPENAI_BASE,
        fallbackModel
      );
      if (r2.ok) return r2.text;
      return (
        'Извините, и primary API (Minimax и т.д.), и резервный OpenAI сейчас недоступны (квота или ошибка). Попробуйте позже.'
      );
    }

    if (r1.quota && !openaiFallbackKey) {
      return (
        'Квота на стороне primary API (например Minimax) исчерпана. ' +
        'Задайте OPENAI_FALLBACK_API_KEY для резервного доступа к OpenAI (api.openai.com) или подождите.'
      );
    }

    customPrimaryFailedNonQuota = true;
    console.warn('[bubbleBot] Primary OpenAI-compatible failed (non-quota) — trying Gemini if configured');
  }

  // 3) Gemini
  if (geminiKey) {
    try {
      return await completeWithGemini(userMessage, systemPrompt);
    } catch (e) {
      if (e instanceof Error && e.message === 'GEMINI_QUOTA' && openaiFallbackKey) {
        console.warn('[bubbleBot] Gemini quota — trying OpenAI fallback');
        const r = await callOpenAIChat(
          userMessage,
          systemPrompt,
          openaiFallbackKey,
          DEFAULT_OPENAI_BASE,
          fallbackModel
        );
        if (r.ok) return r.text;
        return (
          'Квота Google Gemini исчерпана, резервный OpenAI тоже не ответил. ' +
          'Проверьте OPENAI_FALLBACK_API_KEY и квоты. Справка: https://ai.google.dev/gemini-api/docs/rate-limits'
        );
      }
      if (e instanceof Error && e.message === 'GEMINI_QUOTA') {
        return (
          'Квота Google Gemini исчерпана (бесплатный лимит или 0 запросов в день). ' +
          'Задайте OPENAI_FALLBACK_API_KEY для резервного OpenAI или подождите. ' +
          'Справка: https://ai.google.dev/gemini-api/docs/rate-limits'
        );
      }
      console.error('[bubbleBot] Gemini call failed:', e);
      return 'Извините, не удалось обратиться к Gemini. Проверьте GEMINI_API_KEY и GEMINI_MODEL в .env.';
    }
  }

  if (customPrimaryFailedNonQuota && !geminiKey) {
    return (
      'Первичный API (Minimax / OPENAI_BASE_URL) вернул ошибку, Gemini не настроен. ' +
      'Проверьте OPENAI_BASE_URL, OPENAI_MODEL, OPENAI_API_KEY или задайте GEMINI_API_KEY.'
    );
  }

  // 4) Only official OpenAI (no custom base in env)
  if (openaiKey && !isCustomOpenAIBase) {
    const r = await callOpenAIChat(
      userMessage,
      systemPrompt,
      openaiKey,
      DEFAULT_OPENAI_BASE,
      primaryModel
    );
    if (r.ok) return r.text;
    if (r.quota) {
      return 'Квота OpenAI исчерпана. Проверьте биллинг или подождите.';
    }
    return 'Извините, сейчас не могу ответить (ошибка ИИ). Попробуйте позже.';
  }

  console.warn('[bubbleBot] Set GEMINI_API_KEY and/or OPENAI_API_KEY in .env — using fallback reply');
  return `Привет! Я Bubble_Bot. Задайте на сервере OPENAI_BASE_URL+OPENAI_API_KEY (например Minimax), опционально OPENAI_FALLBACK_API_KEY для OpenAI при квоте, и/или GEMINI_API_KEY. Ваше сообщение: «${userMessage.slice(0, 200)}»`;
}

/**
 * After a human sends a message: reply in DMs, or in group/channel/supergroup when @bubble_bot is mentioned.
 */
export async function maybeReplyAsBubbleBot(
  io: Server,
  chatId: string,
  userMessageText: string,
  senderId: string,
  anchorMessageId?: string
): Promise<void> {
  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: { include: { user: true } },
      },
    });

    if (!chat) return;

    const isPrivate = chat.type === 'PRIVATE';
    const isGroupLike =
      chat.type === 'GROUP' || chat.type === 'SUPERGROUP' || chat.type === 'CHANNEL';

    if (!isPrivate && !isGroupLike) return;

    const bot = await prisma.user.findUnique({
      where: { username: BUBBLE_BOT_USERNAME },
    });
    if (!bot) return;

    const botMember = chat.members.find((m) => m.userId === bot.id);
    if (!botMember) return;
    if (senderId === bot.id) return;

    if (isGroupLike && !messageMentionsUser(userMessageText, BUBBLE_BOT_USERNAME)) {
      return;
    }

    const promptText =
      isPrivate ? userMessageText : stripUsernameMention(userMessageText, BUBBLE_BOT_USERNAME);

    const ctx = await buildChatContext(chatId, bot.id, anchorMessageId, 18).catch(() => '');
    const userPrompt = ctx
      ? `Контекст диалога (последние сообщения):\n${ctx}\n\nТекущее сообщение пользователя:\n${promptText}`
      : promptText;

    const text = await completeChat(userPrompt);

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
