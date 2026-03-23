# Telegram-Like Messenger - Спецификация

## 1. Концепция и Видение

Современный мессенджер с акцентом на приватность, скорость и удобство использования. Интерфейс минималистичный, но функциональный — всё нужное под рукой, ничего лишнего. Ощущение "родного" приложения с плавными анимациями и мгновенным откликом.

## 2. Дизайн-система

### Цветовая палитра
- **Primary**: #0088CC (Telegram Blue)
- **Secondary**: #229ED9 (Light Blue)
- **Accent**: #34D399 (Green для онлайн статуса)
- **Background Dark**: #17212B
- **Background Medium**: #1F2C33
- **Background Light**: #2A2F36
- **Text Primary**: #FFFFFF
- **Text Secondary**: #8E9297
- **Message Incoming**: #182533
- **Message Outgoing**: #2A2F36
- **Danger**: #EF4444
- **Warning**: #F59E0B

### Типографика
- **Primary Font**: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif
- **Monospace**: 'JetBrains Mono', monospace
- **Sizes**: 
  - xs: 11px
  - sm: 13px
  - base: 14px
  - lg: 16px
  - xl: 18px
  - 2xl: 24px
  - 3xl: 32px

### Пространственная система
- **Base unit**: 4px
- **Spacing scale**: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px
- **Border radius**: 4px (small), 8px (medium), 12px (large), 20px (pills)
- **Sidebar width**: 350px (desktop), 100% (mobile)
- **Chat area**: flexible

### Философия анимаций
- **Duration**: 150ms (micro), 250ms (standard), 400ms (emphasis)
- **Easing**: cubic-bezier(0.4, 0, 0.2, 1)
- **Принципы**: Не отвлекать, подтверждать действия, показывать прогресс

## 3. Структура и Лейаут

### Desktop Layout
```
┌─────────────────────────────────────────────────────────────┐
│ ┌─────────────┬─────────────────────────────────────────┐   │
│ │   Sidebar   │              Chat Area                 │   │
│ │             │ ┌─────────────────────────────────────┐ │   │
│ │  - Search   │ │          Chat Header               │ │   │
│ │  - Chats    │ ├─────────────────────────────────────┤ │   │
│ │  - Contacts │ │                                     │ │   │
│ │  - Settings │ │          Messages Area              │ │   │
│ │             │ │                                     │ │   │
│ │             │ ├─────────────────────────────────────┤ │   │
│ │             │ │          Input Area                 │ │   │
│ └─────────────┴─────────────────────────────────────┴─┘   │
└─────────────────────────────────────────────────────────────┘
```

### Mobile Layout
- Навигация через нижнюю панель ( chats, calls, contacts, settings )
- Полноэкранный чат при выборе
- Свайп для возврата к списку чатов

## 4. Функциональность

### 4.1 Аутентификация
- **Вход по номеру телефона**: Ввод номера → SMS код → Верификация
- **JWT токены**: Access token (15min) + Refresh token (7 days)
- **Сессии**: Отображение активных сессий, удалённый выход

### 4.2 Контакты
- **Добавление**: Поиск по номеру телефона или username
- **Синхронизация**: Импорт контактов (опционально)
- **Блокировка**: Скрытие из списков, ограничение сообщений

### 4.3 Личные чаты
- **Текстовые сообщения**: До 4096 символов
- **Медиа**: Фото, видео, документы (до 2GB)
- **Пересылка**: Пересылка сообщений другим пользователям
- **Ответы**: Цитирование конкретных сообщений
- **Редактирование**: Изменение в течение 48 часов
- **Удаление**: Удаление для себя/для всех

### 4.4 Групповые чаты
- **Создание**: Название, описание, аватар
- **Участники**: До 200,000 человек
- **Права**: Создатель, админ, участник
- **Модерация**: Удаление сообщений, бан участников
- **Супергруппы**: Все группы = супергруппы (история сохраняется)

### 4.5 Каналы
- **Публичные**: Username, присоединение по ссылке
- **Приватные**: Только по приглашению
- **Подписчики**: Без ограничений
- **Посты**: Авторские, возможность комментировать в связанной группе

### 4.6 E2E Шифрование
- **Протокол**: Signal Protocol (simplified implementation)
- **Key Exchange**: Diffie-Hellman
- **Шифрование**: AES-256-GCM
- **Проверка**: Сравнение визуальных ключей (emoji)

### 4.7 Медиафайлы
- **Загрузка**: Drag & drop, выбор файла, paste
- **Превью**: Инлайн превью для фото/видео
- **Прогресс**: Индикатор загрузки
- **CDN**: Оптимизация для быстрой загрузки

### 4.8 Уведомления
- **PUSH**: Включение/выключение
- **Звук**: Настройка громкости, выбор мелодии
- **Пре view**: Показ текста в уведомлении
- **Конкретные чаты**: Индивидуальные настройки

### 4.9 Поиск
- **Глобальный**: Поиск везде
- **В чате**: История сообщений
- **Фильтры**: По типу (фото, видео, файлы, ссылки)

### 4.10 Статусы (Stories)
- **Длительность**: 24 часа
- **Просмотры**: Список просмотревших
- **Ответы**: Возможность ответить в личку

## 5. Компоненты UI

### 5.1 Sidebar
- **Аватар пользователя**: 40px, круглый, клик → профиль
- **Поиск**: Иконка поиска, горячая клавиша Ctrl+K
- **Список чатов**: 
  - Аватар (48px) + Название + Последнее сообщение + Время
  - Непрочитанные: Bold + Badge (красный circle)
  - Онлайн: Зелёная точка
- **FAB**: Новая сессия (кнопка внизу справа)

### 5.2 Chat Header
- **Левая часть**: Аватар + Имя + Online status
- **Правая часть**: Search + Call (future) + Menu (⋮)

### 5.3 Message Bubble
- **Outgoing**: Справа, синий фон (#0088CC)
- **Incoming**: Слева, тёмный фон (#182533)
- **Элементы**: 
  - Текст (белый, перенос слов)
  - Время (серый, снизу справа)
  - Статус доставки (✓✓ серый/синий)
  - Reply quote (если есть)
  - Media (если есть)

### 5.4 Input Area
- **Attach**: Кнопка attachment (📎)
- **Text field**: Auto-resize, placeholder "Message..."
- **Emoji**: Кнопка emoji (😊)
- **Send**: Кнопка отправки (➤) или Enter
- **Recording**: Hold to record audio

### 5.5 Modal Windows
- **Профиль контакта**: Аватар, инфо, действия
- **Создание группы**: Название, добавление участников
- **Настройки**: Все настройки приложения
- **Подтверждения**: Удаление, выход, блокировка

## 6. Техническая архитектура

### Frontend Stack
- **Framework**: React 18 + TypeScript
- **Styling**: TailwindCSS
- **State**: Zustand
- **Real-time**: Socket.io-client
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod

### Backend Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Real-time**: Socket.io
- **Database**: PostgreSQL (primary) + Redis (cache)
- **ORM**: Prisma
- **Auth**: JWT (jsonwebtoken)
- **Validation**: Zod
- **File Upload**: Multer + S3-compatible storage

### Database Schema (PostgreSQL)

```sql
-- Users
users (
  id UUID PRIMARY KEY,
  phone VARCHAR(20) UNIQUE,
  username VARCHAR(32) UNIQUE,
  display_name VARCHAR(64),
  avatar_url TEXT,
  bio TEXT,
  is_online BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Chats (лички и группы)
chats (
  id UUID PRIMARY KEY,
  type VARCHAR(20), -- 'private', 'group', 'channel'
  title VARCHAR(128),
  avatar_url TEXT,
  description TEXT,
  username VARCHAR(32) UNIQUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Chat Members
chat_members (
  chat_id UUID REFERENCES chats(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(20), -- 'owner', 'admin', 'member'
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id)
)

-- Messages
messages (
  id UUID PRIMARY KEY,
  chat_id UUID REFERENCES chats(id),
  sender_id UUID REFERENCES users(id),
  content TEXT,
  content_type VARCHAR(20), -- 'text', 'image', 'video', 'file', 'audio'
  media_url TEXT,
  reply_to UUID REFERENCES messages(id),
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Message Status (для read receipts)
message_status (
  message_id UUID REFERENCES messages(id),
  user_id UUID REFERENCES users(id),
  status VARCHAR(20), -- 'sent', 'delivered', 'read'
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
)

-- Encryption Keys (для E2EE)
encryption_keys (
  user_id UUID REFERENCES users(id),
  public_key TEXT,
  private_key_encrypted TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id)
)
```

### API Endpoints

#### Auth
- `POST /api/auth/send-code` - Отправить SMS код
- `POST /api/auth/verify` - Верификация кода
- `POST /api/auth/refresh` - Обновить токен
- `POST /api/auth/logout` - Выйти

#### Users
- `GET /api/users/me` - Текущий пользователь
- `PATCH /api/users/me` - Обновить профиль
- `GET /api/users/search?q=` - Поиск пользователей
- `GET /api/users/:id` - Профиль пользователя

#### Chats
- `GET /api/chats` - Список чатов
- `POST /api/chats` - Создать чат/группу
- `GET /api/chats/:id` - Информация о чате
- `PATCH /api/chats/:id` - Обновить чат
- `DELETE /api/chats/:id` - Удалить чат
- `POST /api/chats/:id/members` - Добавить участника
- `DELETE /api/chats/:id/members/:userId` - Удалить участника

#### Messages
- `GET /api/chats/:id/messages?before=` - Загрузить сообщения
- `POST /api/chats/:id/messages` - Отправить сообщение
- `PATCH /api/messages/:id` - Редактировать
- `DELETE /api/messages/:id` - Удалить

#### Files
- `POST /api/upload` - Загрузить файл
- `GET /api/files/:id` - Скачать файл

### WebSocket Events

#### Client → Server
- `join_chat` - Присоединиться к чату
- `leave_chat` - Покинуть чат
- `send_message` - Отправить сообщение
- `typing_start` - Начал печатать
- `typing_stop` - Перестал печатать
- `mark_read` - Отметить как прочитанное

#### Server → Client
- `new_message` - Новое сообщение
- `message_edited` - Сообщение изменено
- `message_deleted` - Сообщение удалено
- `user_online` - Пользователь онлайн
- `user_offline` - Пользователь оффлайн
- `typing` - Кто-то печатает

## 7. Безопасность

### Аутентификация
- HTTPS only
- JWT с коротким сроком жизни
- Refresh token rotation
- Привязка к device fingerprint

### E2E Шифрование
- Генерация ключей на клиенте
- Приватный ключ зашифрован паролем
- Обмен ключами через Signal Protocol
- Forward secrecy

### Данные
- Пароли хешированы (bcrypt)
- PII данные зашифрованы
- Аудит логи (кто, когда, что)

## 8. Масштабируемость

### Горизонтальное масштабирование
- Stateless бэкенд
- Sticky sessions через Redis
- Load balancer ready

### База данных
- Читающие реплики
- Шардирование по user_id
- Индексы на hot queries

### Real-time
- Socket.io с Redis adapter
- Комнаты (rooms) для чатов
- Presence сервер отдельно

## 9. Файловая структура проекта

```
telegram-messenger/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── redis.ts
│   │   │   └── env.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── chat.controller.ts
│   │   │   └── message.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── validation.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── models/
│   │   │   └── prisma.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── chat.routes.ts
│   │   │   └── message.routes.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── chat.service.ts
│   │   │   ├── message.service.ts
│   │   │   └── socket.service.ts
│   │   ├── sockets/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── encryption.ts
│   │   │   └── helpers.ts
│   │   └── app.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   └── ...
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── ChatHeader.tsx
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   └── ChatArea.tsx
│   │   │   └── features/
│   │   │       ├── Auth/
│   │   │       ├── ChatList/
│   │   │       ├── Messages/
│   │   │       └── Profile/
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useChat.ts
│   │   │   ├── useSocket.ts
│   │   │   └── useMessages.ts
│   │   ├── stores/
│   │   │   ├── authStore.ts
│   │   │   ├── chatStore.ts
│   │   │   └── messageStore.ts
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── socket.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── encryption.ts
│   │   │   └── helpers.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── README.md
```

## 10. Deployment

### Docker Compose
```yaml
services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/messenger
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=messenger

  redis:
    image: redis:7
```

### Environment Variables
```
# Backend
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
PORT=3001

# Frontend
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```
