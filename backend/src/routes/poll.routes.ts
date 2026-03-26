import { Router } from 'express';
import { prisma } from '../models/prisma.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { getIoServer } from '../ioServer.js';

import type { AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

type CreatePollBody = {
  question: string;
  options: { text: string }[];
  isAnonymous?: boolean;
  isMultiChoice?: boolean;
  isQuiz?: boolean;
  correctOptionIndex?: number; // only when isQuiz
  replyToId?: string | null;
  mediaUrl?: string | null;
  mediaCaption?: string | null;
};

router.post('/chat/:chatId', authenticateToken, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;
    const { chatId } = req.params;
    const body = req.body as CreatePollBody;

    const question = (body.question ?? '').trim();
    const options = (body.options ?? []).map((o) => ({ text: (o?.text ?? '').trim() }));

    if (!question) return res.status(400).json({ error: 'Question is required' });
    if (options.length < 2) return res.status(400).json({ error: 'At least 2 options are required' });
    if (options.some((o) => !o.text)) return res.status(400).json({ error: 'Option text is required' });

    const isAnonymous = Boolean(body.isAnonymous);
    const isMultiChoice = Boolean(body.isMultiChoice);
    const isQuiz = Boolean(body.isQuiz);
    const correctOptionIndex = typeof body.correctOptionIndex === 'number' ? body.correctOptionIndex : 0;
    const mediaUrl = body.mediaUrl ?? null;
    const mediaCaption = body.mediaCaption ?? null;

    // Verify user is a member and chat is group-like
    const membership = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { type: true, members: { select: { userId: true } } },
    });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (chat.type !== 'GROUP' && chat.type !== 'SUPERGROUP') {
      return res.status(400).json({ error: 'Polls are allowed only in group chats' });
    }

    const correctOption = isQuiz
      ? Math.min(Math.max(correctOptionIndex, 0), options.length - 1)
      : null;

    // Create poll + options
    const poll = await prisma.poll.create({
      data: {
        chatId,
        createdById: userId,
        question,
        isAnonymous,
        isMultiChoice,
        isQuiz,
        mediaUrl,
        mediaCaption,
      },
      select: { id: true },
    });

    const pollOptions = await prisma.pollOption.createMany({
      data: options.map((o, idx) => ({
        pollId: poll.id,
        text: o.text,
        order: idx,
      })),
      skipDuplicates: true,
    });

    // Fetch created option ids (createMany doesn't return rows)
    const createdOptions = await prisma.pollOption.findMany({
      where: { pollId: poll.id },
      orderBy: { order: 'asc' },
      select: { id: true },
    });

    const correctOptionId =
      typeof correctOption === 'number' ? createdOptions[correctOption]?.id ?? null : null;

    if (isQuiz) {
      await prisma.poll.update({
        where: { id: poll.id },
        data: { correctOptionId },
      });
    }

    // Create a message bubble so poll shows in history
    const messageContent = JSON.stringify({
      kind: 'poll',
      pollId: poll.id,
    });

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: userId,
        content: messageContent,
        contentType: 'TEXT',
        replyToId: body.replyToId || null,
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    // Mark receipt statuses for recipients
    const members = await prisma.chatMember.findMany({
      where: { chatId, userId: { not: userId } },
      select: { userId: true },
    });

    await prisma.messageStatus.createMany({
      data: members.map((m) => ({
        messageId: message.id,
        userId: m.userId,
        status: 'SENT',
      })),
    });

    const io = getIoServer();
    if (io) {
      const full = await prisma.message.findUnique({
        where: { id: message.id },
        include: {
          sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          statuses: { select: { userId: true, status: true } },
        },
      });
      if (full) io.to(`chat:${chatId}`).emit('new_message', full);
    }

    await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });

    return res.json({ pollId: poll.id });
  } catch (e) {
    console.error('createPoll error:', e);
    return res.status(500).json({ error: 'Failed to create poll' });
  }
});

type VoteBody = { optionId: string };

router.post('/:pollId/vote', authenticateToken, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;
    const { pollId } = req.params;
    const { optionId } = req.body as VoteBody;

    if (!optionId) return res.status(400).json({ error: 'optionId is required' });

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    // membership check
    const membership = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId: poll.chatId, userId } },
    });
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const option = await prisma.pollOption.findUnique({
      where: { id: optionId },
      select: { id: true, pollId: true },
    });
    if (!option || option.pollId !== pollId) return res.status(400).json({ error: 'Invalid option' });

    const isMultiChoice = poll.isMultiChoice;

    if (!isMultiChoice) {
      // single-choice: toggle by deleting previous vote if same option
      const existing = await prisma.pollVote.findUnique({
        where: { pollId_userId_optionId: { pollId, userId, optionId } },
      });
      await prisma.pollVote.deleteMany({ where: { pollId, userId } });
      if (existing) {
        // user clicked already selected => unvote (no votes)
      } else {
        await prisma.pollVote.create({ data: { pollId, userId, optionId } });
      }
    } else {
      // multi-choice: toggle option
      const existing = await prisma.pollVote.findUnique({
        where: { pollId_userId_optionId: { pollId, userId, optionId } },
      });
      if (existing) {
        await prisma.pollVote.delete({
          where: { pollId_userId_optionId: { pollId, userId, optionId } },
        });
      } else {
        await prisma.pollVote.create({ data: { pollId, userId, optionId } });
      }
    }

    const summary = await getPollSummary(pollId, userId);

    const io = getIoServer();
    if (io) {
      io.to(`chat:${poll.chatId}`).emit('poll_updated', {
        pollId,
        chatId: poll.chatId,
      });
    }

    return res.json(summary);
  } catch (e) {
    console.error('votePoll error:', e);
    return res.status(500).json({ error: 'Failed to vote' });
  }
});

router.get('/:pollId/summary', authenticateToken, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;
    const { pollId } = req.params;
    const summary = await getPollSummary(pollId, userId);
    return res.json(summary);
  } catch (e) {
    console.error('pollSummary error:', e);
    return res.status(500).json({ error: 'Failed to load poll summary' });
  }
});

async function getPollSummary(pollId: string, userId: string) {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    select: {
      id: true,
      chatId: true,
      question: true,
      isAnonymous: true,
      isMultiChoice: true,
      isQuiz: true,
      correctOptionId: true,
      mediaUrl: true,
      mediaCaption: true,
      options: { select: { id: true, text: true, order: true } },
    },
  });
  if (!poll) throw new Error('Poll not found');

  const options = [...poll.options].sort((a, b) => a.order - b.order);

  const voteCounts = await prisma.pollVote.groupBy({
    by: ['optionId'],
    where: { pollId },
    _count: { _all: true },
  });
  const countMap = new Map<string, number>();
  for (const row of voteCounts) countMap.set(row.optionId, row._count._all);

  const myVotes = await prisma.pollVote.findMany({
    where: { pollId, userId },
    select: { optionId: true },
  });
  const myOptionIds = myVotes.map((v) => v.optionId);

  return {
    pollId,
    chatId: poll.chatId,
    question: poll.question,
    isAnonymous: poll.isAnonymous,
    isMultiChoice: poll.isMultiChoice,
    isQuiz: poll.isQuiz,
    correctOptionId: poll.correctOptionId,
    mediaUrl: poll.mediaUrl,
    mediaCaption: poll.mediaCaption,
    myOptionIds,
    options: options.map((o) => ({
      id: o.id,
      text: o.text,
      order: o.order,
      voteCount: countMap.get(o.id) ?? 0,
    })),
  };
}

export default router;

