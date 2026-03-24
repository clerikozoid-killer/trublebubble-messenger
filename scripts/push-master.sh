#!/usr/bin/env bash
# После правок: pull → add → commit → push (ветка master по умолчанию).
# Использование:
#   ./scripts/push-master.sh "fix: netlify publish path"
#   BACKUP_UPLOADS=1 ./scripts/push-master.sh "chore: sync"
#   BACKUP_UPLOADS=1 BACKUP_COPY_TO=~/YandexDisk/trublebubble-uploads ./scripts/push-master.sh "chore: sync"
#   NO_PULL=1 ./scripts/push-master.sh "wip"

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

BRANCH="${BRANCH:-master}"
MSG="${1:-}"
NO_PULL="${NO_PULL:-0}"

if [[ ! -d .git ]]; then
  echo "Нет .git в $REPO_ROOT" >&2
  exit 1
fi

CURRENT="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT" != "$BRANCH" ]]; then
  echo "Сейчас ветка «$CURRENT», нужна «$BRANCH»: git checkout $BRANCH" >&2
  exit 1
fi

if [[ "${BACKUP_UPLOADS:-}" == "1" ]]; then
  bash "$REPO_ROOT/scripts/backup-uploads.sh" "$REPO_ROOT" "${BACKUP_COPY_TO:-}" || true
fi

if [[ "$NO_PULL" != "1" ]]; then
  echo "git pull --rebase origin $BRANCH"
  git pull --rebase origin "$BRANCH"
fi

echo "git add -A"
git add -A

if git diff --staged --quiet; then
  echo "Коммитить нечего."
  exit 0
fi

if [[ -z "$MSG" ]]; then
  read -r -p "Сообщение коммита: " MSG
fi
if [[ -z "$MSG" ]]; then
  MSG="chore: sync $(date '+%Y-%m-%d %H:%M')"
fi

echo "git commit -m ..."
git commit -m "$MSG"

echo "git push origin $BRANCH"
git push origin "$BRANCH"
echo "Готово."
