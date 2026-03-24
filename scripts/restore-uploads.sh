#!/usr/bin/env bash
# ./scripts/restore-uploads.sh /path/to/uploads-20250324.zip
# ./scripts/restore-uploads.sh --latest-from ~/YandexDisk/trublebubble-uploads
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UPLOADS="$REPO_ROOT/backend/uploads"

if [[ "${1:-}" == "--latest-from" ]]; then
  DIR="${2:?укажите папку}"
  if [[ ! -d "$DIR" ]]; then
    echo "Папка не найдена: $DIR" >&2
    exit 1
  fi
  ZIP="$(ls -t "$DIR"/uploads-*.zip 2>/dev/null | head -1 || true)"
  if [[ -z "$ZIP" || ! -f "$ZIP" ]]; then
    echo "В $DIR нет uploads-*.zip" >&2
    exit 1
  fi
  echo "Берём последний архив: $ZIP"
else
  ZIP="${1:-}"
  if [[ -z "$ZIP" || ! -f "$ZIP" ]]; then
    echo "Укажите: $0 path/to/uploads-*.zip  или  $0 --latest-from /sync/folder" >&2
    exit 1
  fi
fi

mkdir -p "$UPLOADS"
echo "Распаковка в $UPLOADS ..."
unzip -o "$ZIP" -d "$UPLOADS"
echo "Готово."
