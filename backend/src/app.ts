import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import chatRoutes from './routes/chat.routes.js';
import messageRoutes from './routes/message.routes.js';
import adminRoutes from './routes/admin.routes.js';
import translateRoutes from './routes/translate.routes.js';
import pollRoutes from './routes/poll.routes.js';
import { bootstrapAdmin } from './bootstrapAdmin.js';
import { bootstrapBubbleBot } from './bootstrapBubbleBot.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { setupSocketHandlers } from './sockets/index.js';
import { registerIoServer } from './ioServer.js';
import { resolveCorsOrigin } from './utils/corsOrigins.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const corsOrigin = resolveCorsOrigin();

export const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

registerIoServer(io);

// Middleware
// Security headers.
app.use(
  helmet({
    contentSecurityPolicy: false, // avoid breaking existing asset loading.
    crossOriginEmbedderPolicy: false,
  })
);

// Basic rate limiting (helps against brute-force + abusive endpoints).
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300, // per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiLimiter);

const uploadDir = process.env.UPLOAD_DIR || './uploads';
fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(path.resolve(uploadDir)));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/polls', pollRoutes);

// Error handling
app.use(errorMiddleware);

// Socket.io setup
setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  try {
    await bootstrapAdmin();
    await bootstrapBubbleBot();
  } catch (e) {
    console.error('bootstrapAdmin / bootstrapBubbleBot failed:', e);
  }
});

export default app;
