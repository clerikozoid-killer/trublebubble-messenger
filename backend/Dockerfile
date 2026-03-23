FROM node:18-alpine AS builder

# Prisma engines need OpenSSL; without it the schema engine crashes (non-JSON "Error..." on Alpine).
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN npm run build

FROM node:18-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production

EXPOSE 3001

# No prisma/migrations in repo — sync schema like local `db:push`. --accept-data-loss: required when Prisma detects destructive diffs (e.g. after schema changes).
CMD ["sh", "-c", "mkdir -p uploads && npx prisma db push --accept-data-loss && npm start"]
