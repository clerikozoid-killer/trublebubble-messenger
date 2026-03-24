#Requires -Version 5.1
<#
  Архивирует backend/uploads в backups/uploads-YYYYMMDD-HHmmss.zip (не в git).

  Опционально копирует zip в «облачную» папку (-CopyTo или env TRUBLEBUBBLE_BACKUP_COPY_TO),
  которая синхронизируется между ПК (Яндекс.Диск, OneDrive, Dropbox и т.д.) —
  на втором компьютере возьмите последний архив из той же папки и restore-uploads.ps1.

  Временные публичные файлообменники с истечением срока для личных медиа не используйте.
#>
param(
  [string] $RepoRoot = "",
  [string] $CopyTo = ""
)

$ErrorActionPreference = "Stop"
if (-not $RepoRoot) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$uploads = Join-Path $RepoRoot "backend\uploads"
if (-not (Test-Path $uploads)) {
  Write-Host "Папки нет: $uploads — пропуск бэкапа."
  exit 0
}

$items = Get-ChildItem -Path $uploads -Force -ErrorAction SilentlyContinue
if (-not $items) {
  Write-Host "backend/uploads пуста — бэкап не нужен."
  exit 0
}

$backups = Join-Path $RepoRoot "backups"
New-Item -ItemType Directory -Force -Path $backups | Out-Null
$name = "uploads-{0:yyyyMMdd-HHmmss}.zip" -f (Get-Date)
$zip = Join-Path $backups $name

Push-Location $uploads
try {
  Compress-Archive -Path * -DestinationPath $zip -Force
} finally {
  Pop-Location
}
Write-Host "Бэкап: $zip" -ForegroundColor Green

$destParent = $CopyTo.Trim()
if (-not $destParent -and $env:TRUBLEBUBBLE_BACKUP_COPY_TO) {
  $destParent = $env:TRUBLEBUBBLE_BACKUP_COPY_TO.Trim()
}
if ($destParent) {
  if (-not (Test-Path -LiteralPath $destParent)) {
    New-Item -ItemType Directory -Force -Path $destParent | Out-Null
  }
  $copyPath = Join-Path $destParent (Split-Path -Leaf $zip)
  Copy-Item -LiteralPath $zip -Destination $copyPath -Force
  Write-Host "Копия для синхронизации: $copyPath" -ForegroundColor Green
}
