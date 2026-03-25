# Локальный фронт в интернете: Cloudflare Tunnel, ngrok, localtunnel

Нужно, чтобы **с твоего ПК** открывался сайт по **публичному HTTPS‑URL**, без деплоя на Netlify. Туннель проксирует трафик с интернета на **`localhost:5173`** (Vite).

---

## Docker Compose + Cloudflare quick tunnel (всё одной командой)

Стек уже описан в `docker-compose.yml`: фронт (nginx) проксирует `/api`, `/socket.io`, `/uploads` на `backend`. Отдельный контейнер **`cloudflared`** с профилем **`tunnel`** отдаёт наружу тот же фронт.

### Порядок действий

1. В **корне репозитория** создай файл `.env` (рядом с `docker-compose.yml`) или добавь строку в существующий:
   ```env
   CORS_ALLOW_TRY_CLOUDFLARE=1
   ```
   Иначе бэкенд не примет WebSocket с домена `*.trycloudflare.com`.

2. Подними стек **с профилем** `tunnel`:
   ```bash
   docker compose --profile tunnel up -d --build
   ```

3. Узнай публичный URL (в логах cloudflared будет `https://….trycloudflare.com`):
   ```bash
   docker compose logs cloudflared
   ```

4. Открой этот URL в браузере или с телефона. Локально по-прежнему: `http://localhost:5173`.

5. Остановка:
   ```bash
   docker compose --profile tunnel down
   ```

**Замечания:** URL quick tunnel меняется при новом запуске. Контейнер `cloudflared` ходит на **`http://frontend:80`** внутри сети compose — отдельно nginx не настраивай.

### Если Cloudflare в вашей сети нестабилен (QUIC/TLS EOF) — Docker ngrok

Можно поднять туннель **ngrok** тоже через compose (без установки в Windows):

1. Зарегистрируйся на https://dashboard.ngrok.com/ и скопируй `Authtoken`.
2. В корневом `.env` (рядом с `docker-compose.yml`) добавь:
   ```env
   CORS_ALLOW_NGROK=1
   NGROK_AUTHTOKEN=ваш_токен
   ```
3. Запусти профиль ngrok:
   ```bash
   docker compose --profile tunnel-ngrok up -d --build
   ```
4. Посмотри публичный URL:
   ```bash
   docker compose logs ngrok
   ```
   Ищи `https://....ngrok-free.app`.

Остановка:
```bash
docker compose --profile tunnel-ngrok down
```

### Если ngrok блокирует ваш IP (ERR_NGROK_9040) — Docker localtunnel

Можно поднять localtunnel через compose без токенов:

1. В корневом `.env` добавь:
   ```env
   CORS_ALLOW_LOCALTUNNEL=1
   ```
2. Запусти профиль localtunnel:
   ```bash
   docker compose --profile tunnel-lt up -d --build
   ```
3. Посмотри публичный URL:
   ```bash
   docker compose logs localtunnel
   ```
   Обычно это `https://<слово>.loca.lt`.
   Также compose пишет последний URL в файл `tmp/localtunnel.url` (удобно без пролистывания логов):
   ```bash
   cat tmp/localtunnel.url
   ```

Если из‑за смены публичного IP возникает ошибка вроде `endpoint IP is not correct` — берите пароль с той же сети/без VPN и всегда заново через:
```powershell
.\scripts\tunnel-password.ps1
```

Остановка:
```bash
docker compose --profile tunnel-lt down
```

Примечание: localtunnel иногда менее стабилен, чем ngrok/cloudflared, но часто работает в сетях, где ngrok/Cloudflare режутся.
Если видите `connection refused: localtunnel.me:<порт>`, значит сеть режет часть портов. В compose используется `--host https://loca.lt`, это обычно стабильнее. Если всё равно падает — это сетевой блок, лучше сменить сеть/VPN или использовать другой туннель.

---

## С чего начать (общее, без Docker)

1. В корне репозитория подними фронт:
   ```bash
   cd frontend
   npm run dev
   ```
   По умолчанию слушает **порт `5173`**.

2. Реши, куда ходит API:
   - **Вариант A — всё локально (удобно для туннеля):** бэкенд на **`http://localhost:3001`**, в `frontend/.env` **не задавай** `VITE_API_URL` и `VITE_WS_URL` (или закомментируй). Тогда запросы идут на тот же хост, что и страница (`/api`, `/socket.io`), и **Vite прокси** (см. `vite.config.ts`) пересылает их на `localhost:3001`. Открой туннель именно на **5173**.
   - **Вариант B — API на Render:** в `.env` указаны `VITE_API_URL` / `VITE_WS_URL` на Render. Тогда с туннеля грузится только статика с твоего ПК, а данные — с Render. Нужно, чтобы на бэкенде **CORS** разрешал origin вида `https://xxxx.ngrok-free.app` или `https://xxxx.trycloudflare.com` (см. ниже).

3. В отдельном терминале запускай **один** из туннелей ниже (он должен смотреть на **5173**, если не менял порт).

---

## 1) Cloudflare Tunnel (quick tunnel) — часто самый простой

**Плюсы:** не нужен аккаунт для быстрого теста, выдаётся случайный `*.trycloudflare.com`.  
**Минусы:** URL меняется при каждом новом запуске (для постоянного имени нужен зарегистрированный туннель в Cloudflare).

### Шаги

1. Скачай **`cloudflared`** для Windows:  
   https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

2. Убедись, что Vite запущен: `npm run dev` в `frontend/` (порт 5173).

3. В PowerShell:
   ```powershell
   cloudflared tunnel --url http://127.0.0.1:5173
   ```

4. В выводе появится строка вида `https://random-words.trycloudflare.com` — это и есть внешний URL. Открой в браузере с телефона (та же Wi‑Fi или мобильный интернет).

5. Остановка: `Ctrl+C` в том же окне.

---

## 2) ngrok

**Плюсы:** стабильный инструмент, удобный дашборд, можно закрепить домен на платном плане.  
**Минусы:** нужна регистрация и **authtoken** (бесплатно).

### Шаги

1. Регистрация: https://dashboard.ngrok.com/signup  

2. Установка: https://ngrok.com/download — или через пакетный менеджер.

3. Один раз привяжи токен (команда из личного кабинета):
   ```powershell
   ngrok config add-authtoken <ТВОЙ_ТОКЕН>
   ```

4. Запусти туннель на Vite:
   ```powershell
   ngrok http 5173
   ```

5. В интерфейсе ngrok (или в консоли) будет **Forwarding** `https://xxxx.ngrok-free.app` → открой этот URL.

6. На бесплатном плане иногда показывается страница-предупреждение ngrok — нажми **Visit Site**.

Если API с **Render**, добавь в CORS бэкенда origin вида `https://xxxx.ngrok-free.app` (или настрой `FRONTEND_URL` / массив origins в коде, если уже есть).

---

## 3) localtunnel

**Плюсы:** без отдельной установки — через `npx`.  
**Минусы:** нестабильнее, иногда режут WebSocket; пароль на первый заход может запрашиваться.

### Шаги

1. Vite запущен на 5173.

2. В новом терминале:
   ```powershell
   cd frontend
   npx localtunnel --port 5173
   ```

3. В логе появится URL вида `https://something.loca.lt`. Открой его; при запросе пароля смотри вывод в консоли или документацию localtunnel.

4. Остановка: `Ctrl+C`.

---

## Что выбрать по порядку «попробовать»

| Цель | Рекомендация |
|------|----------------|
| Быстро показать с телефона, без регистрации | **cloudflared** `--url http://127.0.0.1:5173` |
| Нужен привычный сервис и стабильность | **ngrok** |
| Не хочу ставить бинарники, только npm | **localtunnel** (`npx`) |

---

## Важные ограничения

- **ПК должен быть включён**, запущены Vite (и при варианте A — бэкенд). Выключил ноутбук — ссылка не работает.
- **URL у quick‑туннелей обычно временный** — новый запуск = новый адрес (кроме платных настроек ngrok/Cloudflare).
- **Безопасность:** ссылка доступна всем, у кого есть URL. Не публикуй в открытые чаты, не держи так прод с секретами.
- **Mixed content:** туннель даёт **HTTPS**; если в `.env` прописан **`http://`** API на другом хосте, браузер может ругаться — лучше API тоже HTTPS (Render уже https).

---

## Если что-то не грузится

1. Проверь, что **`npm run dev`** слушает 5173 и нет ошибок в консоли.
2. Вариант A: запущен ли **`backend`** на `3001` и совпадает ли прокси в `vite.config.ts`.
3. Вариант B (Render): открой **F12 → Console / Network** — ошибки **CORS** → добавь origin туннеля в настройки CORS бэкенда или временно тестируй через вариант A.

---

## Альтернатива без туннеля

Собрать прод: `npm run build` в `frontend`, выкладывать `dist/` на VPS или редко деплоить в Netlify через CLI — это уже не «живой dev», а статика.
