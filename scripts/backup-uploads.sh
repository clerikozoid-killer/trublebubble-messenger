#!/usr/bin/env bash
# Архивирует backend/uploads в backups/uploads-*.zip
# Второй аргумент или TRUBLEBUBBLE_BACKUP_COPY_TO — папка синхронизации (облако).
set -euo pipefail
REPO_ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
COPY_TO="${2:-${TRUBLEBUBBLE_BACKUP_COPY_TO:-}}"
UPLOADS="$REPO_ROOT/backend/uploads"
BACKUPS="$REPO_ROOT/backups"

if [[ ! -d "$UPLOADS" ]] || [[ -z "$(ls -A "$UPLOADS" 2>/dev/null)" ]]; then
  echo "backend/uploads пуста или отсутствует — пропуск."
  exit 0
fi

mkdir -p "$BACKUPS"
ZIP="$BACKUPS/uploads-$(date '+%Y%m%d-%H%M%S').zip"
( cd "$UPLOADS" && zip -r "$ZIP" . )
echo "Бэкап: $ZIP"

if [[ -n "$COPY_TO" ]]; then
  mkdir -p "$COPY_TO"
  cp -f "$ZIP" "$COPY_TO/"
  echo "Копия для синхронизации: $COPY_TO/$(basename "$ZIP")"
fi
