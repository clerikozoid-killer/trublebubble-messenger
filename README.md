# TrubleBubble

A full-stack instant messaging app (formerly Telegram-style demo). Register with **email + password**, or use admin tools to create accounts.

## Features

### Core Messaging
- Real-time messaging with WebSocket
- Private chats and group conversations
- Message statuses (sent, delivered, read)
- Reply and quote messages
- Edit messages (within 48 hours)
- Delete messages for everyone or just yourself

### User Features
- Phone number authentication (SMS verification)
- Username-based login
- User profiles with avatars and bio
- Online/offline status
- Typing indicators

### Groups & Channels
- Create groups with custom names
- Add/remove members
- Group chat with unlimited members
- Public channels (basic support)

### Modern UI/UX
- Dark mode theme (TrubleBubble pink accents)
- Responsive design (mobile & desktop)
- Smooth animations
- Message bubbles with timestamps
- Unread message badges

### Security
- JWT authentication
- Protected API endpoints
- Secure password hashing

## Tech Stack

### Frontend
- React 18 + TypeScript
- TailwindCSS
- Zustand (state management)
- Socket.io-client
- React Router v6
- Lucide React (icons)
- date-fns

### Backend
- Node.js + Express
- Socket.io (real-time)
- PostgreSQL + Prisma
- JWT authentication
- bcrypt (password hashing)

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Configure your database URL in `.env`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/messenger"
```

5. Generate Prisma client and push schema:
```bash
npm run db:generate
npm run db:push
```

6. Start the development server:
```bash
npm run dev
```

The backend will run on http://localhost:3001

7. **Optional — bootstrap admin:** set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`. On startup the server creates or updates that user as an admin (`username` defaults to `truble_admin`). Admins can create more accounts under **Settings → Create & manage users** (or `POST /api/admin/users`).

8. **Registration:** users can sign up with **email + password** at `/register`. Phone codes are **demo only** (code is logged and returned by the API, not sent via SMS).

9. **Test user `Bubble_Bot`:** on backend startup a user **`bubble_bot`** (display name **Bubble_Bot**) is created or updated — search for `bubble` in **New message**, or sign in with username **`bubble_bot`** / email **`bubble_bot@local.trublebubble`** and password **`BubbleBot_Test_1`** (override with `BUBBLE_BOT_EMAIL`, `BUBBLE_BOT_PASSWORD` in `.env`; disable seeding with `BUBBLE_BOT_SEED=0`).

### Bubble_Bot + Gemini (в т.ч. без VPN из РФ)

Ответы бота идут в **Google Gemini** (или OpenAI-совместимый API). Прямой запрос к `generativelanguage.googleapis.com` из некоторых сетей может быть недоступен.

В **`backend/.env`** можно задать:

- **`GEMINI_BASE_URL`** — базовый URL зеркала или прокси, который проксирует Gemini REST. Пример (подставьте свой рабочий endpoint):
  - `GEMINI_BASE_URL=https://api.genai.gd.edu.kg/google`  
  Итоговый путь к API: `/v1beta/models/...:generateContent` (как у Google).
- **`GEMINI_API_KEY_IN_HEADER=true`** — если прокси не принимает ключ в query `?key=...`, ключ уходит в заголовке **`x-goog-api-key`** (как в официальном API).
- **`GEMINI_HTTPS_PROXY`** (или `HTTPS_PROXY`) — если нужен отдельный **HTTP(S) прокси** до зеркала (корпоративный прокси, не путать с `GEMINI_BASE_URL`).
- **`GEMINI_API_VERSION`** — по умолчанию `v1beta`; меняйте только если зеркало требует другой префикс пути.

После изменения `.env` перезапустите backend.

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
echo "VITE_API_URL=http://localhost:3001" > .env
echo "VITE_WS_URL=http://localhost:3001" >> .env
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on http://localhost:5173

### End-to-end tests (Playwright)

With **backend + frontend** (or `docker compose up`) running, from the `frontend` folder:

```bash
npm install
npx playwright install chromium   # once per machine
npm run test:e2e
```

Optional: `PLAYWRIGHT_BASE_URL` (default `http://localhost:5173` with Docker). Backend on **3001** must be running. Local `vite preview` and `vite dev` proxy `/api` via `vite.config.ts` (including `preview.proxy`).

Tests: public routes, guest redirect from `/settings`, and **register → settings → save**.

## Project Structure

```
telegram-messenger/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   ├── src/
│   │   ├── middleware/        # Auth & error middleware
│   │   ├── models/            # Prisma client
│   │   ├── routes/            # API routes
│   │   ├── sockets/           # WebSocket handlers
│   │   ├── utils/             # JWT & bcrypt utilities
│   │   └── app.ts             # Express app setup
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── pages/             # Page components
│   │   ├── services/          # API & socket services
│   │   ├── stores/            # Zustand stores
│   │   ├── types/             # TypeScript types
│   │   └── App.tsx            # Main app component
│   └── package.json
├── SPEC.md                    # Project specification
└── README.md                  # This file
```

## API Endpoints

### Authentication
- `POST /api/auth/send-code` - Send verification code
- `POST /api/auth/verify` - Verify code & login
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/register` - Register new account
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users/me` - Get current user
- `PATCH /api/users/me` - Update profile
- `GET /api/users/search?q=` - Search users
- `GET /api/users/:id` - Get user by ID

### Chats
- `GET /api/chats` - List all chats
- `POST /api/chats` - Create chat/group
- `GET /api/chats/:id` - Get chat details
- `PATCH /api/chats/:id` - Update chat
- `DELETE /api/chats/:id` - Delete chat
- `POST /api/chats/:id/members` - Add members
- `DELETE /api/chats/:id/members/:userId` - Remove member

### Messages
- `GET /api/messages/chat/:chatId` - Get messages
- `POST /api/messages/chat/:chatId` - Send message
- `PATCH /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message
- `POST /api/messages/chat/:chatId/read` - Mark as read

## WebSocket Events

### Client → Server
- `join_chat` - Join a chat room
- `leave_chat` - Leave a chat room
- `send_message` - Send a message
- `typing_start` / `typing_stop` - Typing indicators
- `mark_read` - Mark messages as read
- `edit_message` - Edit a message
- `delete_message` - Delete a message

### Server → Client
- `new_message` - New message received
- `message_edited` - Message was edited
- `message_deleted` - Message was deleted
- `message_sent` - Message sent confirmation
- `message_delivered` - Message delivered
- `message_read` - Message was read
- `typing` - User typing indicator
- `user_online` / `user_offline` - User status

## Database Schema

### Users
- id, phone, username, displayName, avatarUrl, bio
- passwordHash, isOnline, lastSeenAt, createdAt

### Chats
- id, type (PRIVATE/GROUP/CHANNEL), title, avatarUrl
- description, username, createdById, createdAt

### ChatMembers
- chatId, userId, role (OWNER/ADMIN/MEMBER), joinedAt

### Messages
- id, chatId, senderId, content, contentType
- mediaUrl, replyToId, isEdited, isDeleted, createdAt

### MessageStatuses
- messageId, userId, status (SENT/DELIVERED/READ)

## Future Enhancements

- End-to-end encryption (Signal Protocol)
- File uploads (images, videos, documents)
- Voice messages
- Video calls
- Stories/Status
- Search within chats
- Message reactions
- Bot API support
- Desktop application

## License

MIT License
