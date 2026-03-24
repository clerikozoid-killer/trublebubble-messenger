#Requires -Version 5.1
<#
  Распаковывает zip бэкапа в backend/uploads (создаёт папку при необходимости).

.EXAMPLE
  .\scripts\restore-uploads.ps1 -ZipPath C:\path\uploads-20250324-120000.zip
.EXAMPLE
  .\scripts\restore-uploads.ps1 -LatestFrom "$env:USERPROFILE\YandexDisk\trublebubble-uploads"
#>
param(
  [string] $ZipPath = "",
  [string] $LatestFrom = "",
  [string] $RepoRoot = ""
)

$ErrorActionPreference = "Stop"
if (-not $RepoRoot) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

if ($ZipPath -and $LatestFrom) {
  Write-Error "Укажите только один из параметров: -ZipPath или -LatestFrom"
  exit 1
}

if ($LatestFrom) {
  $dir = $LatestFrom.Trim()
  if (-not (Test-Path -LiteralPath $dir)) {
    Write-Error "Папка не найдена: $dir"
    exit 1
  }
  $latest = Get-ChildItem -LiteralPath $dir -Filter "uploads-*.zip" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if (-not $latest) {
    Write-Error "В $dir нет файлов uploads-*.zip"
    exit 1
  }
  $ZipPath = $latest.FullName
  Write-Host "Берём последний архив: $ZipPath" -ForegroundColor Cyan
}

if (-not $ZipPath) {
  Write-Error "Укажите -ZipPath путь\к\архиву.zip или -LatestFrom папку_с_синхронизацией"
  exit 1
}

if (-not (Test-Path -LiteralPath $ZipPath)) {
  Write-Error "Файл не найден: $ZipPath"
  exit 1
}

$uploads = Join-Path $RepoRoot "backend\uploads"
New-Item -ItemType Directory -Force -Path $uploads | Out-Null

Write-Host "Распаковка в $uploads ..." -ForegroundColor Cyan
Expand-Archive -Path $ZipPath -DestinationPath $uploads -Force
Write-Host "Готово. Перезапустите бэкенд при необходимости." -ForegroundColor Green
