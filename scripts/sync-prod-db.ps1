#Requires -Version 5.1
<#
.SYNOPSIS
  Синхронизирует локальную Docker-БД messenger из продовой PostgreSQL.

.DESCRIPTION
  1) Делает pg_dump с прода в backups/db/*.dump
  2) Восстанавливает дамп в локальную БД (docker compose db)

  ВНИМАНИЕ: локальные данные БД будут перезаписаны (pg_restore --clean --if-exists).

.EXAMPLE
  .\scripts\sync-prod-db.ps1 -ProdDatabaseUrl "postgresql://user:pass@host:5432/db?sslmode=require"

.EXAMPLE
  $env:TRUBLEBUBBLE_PROD_DATABASE_URL="postgresql://..."
  .\scripts\sync-prod-db.ps1
#>
param(
  [string] $ProdDatabaseUrl = "",
  [string] $BackupDir = "",
  [switch] $SkipConfirm
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

if (-not (Test-Path (Join-Path $repoRoot "docker-compose.yml"))) {
  Write-Error "Не найден docker-compose.yml в $repoRoot"
  exit 1
}

if (-not $ProdDatabaseUrl.Trim()) {
  $ProdDatabaseUrl = $env:TRUBLEBUBBLE_PROD_DATABASE_URL
}
if (-not $ProdDatabaseUrl.Trim()) {
  Write-Error "Укажите -ProdDatabaseUrl или env TRUBLEBUBBLE_PROD_DATABASE_URL"
  exit 1
}

if (-not $BackupDir.Trim()) {
  $BackupDir = Join-Path $repoRoot "backups\db"
}
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dumpFile = Join-Path $BackupDir "prod-$stamp.dump"

Write-Host "Поднимаю локальную db..." -ForegroundColor Cyan
docker compose up -d db | Out-Null

Write-Host "Снимаю дамп с прода -> $dumpFile" -ForegroundColor Cyan
docker run --rm `
  -e "PROD_DB_URL=$ProdDatabaseUrl" `
  -v "${BackupDir}:/backup" `
  postgres:15-alpine `
  sh -lc 'pg_dump "$PROD_DB_URL" -Fc -f /backup/prod.dump'

if (-not (Test-Path (Join-Path $BackupDir "prod.dump"))) {
  Write-Error "Дамп не создан."
  exit 1
}
Move-Item -Force (Join-Path $BackupDir "prod.dump") $dumpFile

if (-not $SkipConfirm) {
  Write-Host ""
  Write-Host "Локальная БД messenger будет ПЕРЕЗАПИСАНА из дампа:" -ForegroundColor Yellow
  Write-Host "  $dumpFile" -ForegroundColor Yellow
  $ans = Read-Host "Продолжить? (yes/no)"
  if ($ans -ne "yes") {
    Write-Host "Отменено. Дамп сохранен: $dumpFile" -ForegroundColor Yellow
    exit 0
  }
}

Write-Host "Восстанавливаю дамп в локальную БД..." -ForegroundColor Cyan
docker run --rm `
  -e "PGPASSWORD=postgres" `
  -v "${BackupDir}:/backup" `
  postgres:15-alpine `
  sh -lc 'pg_restore -h host.docker.internal -p 5432 -U postgres -d messenger --clean --if-exists --no-owner --no-privileges /backup/'"$(Split-Path -Leaf $dumpFile)"

Write-Host "Готово. Локальная БД синхронизирована." -ForegroundColor Green
Write-Host "Дамп сохранен: $dumpFile" -ForegroundColor Green
