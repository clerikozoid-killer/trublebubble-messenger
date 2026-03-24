#Requires -Version 5.1
<#
.SYNOPSIS
  После правок: pull → add → commit → push в ветку master (или -Branch).

.DESCRIPTION
  Репозиторий ищется от каталога scripts/. Секреты в .env в git не попадают.
  Локальные аватарки/медиа лежат в backend/uploads/ (в .gitignore) — на другом
  ПК их не будет, пока не скопируете бэкап (см. backup-uploads.ps1 / restore-uploads.ps1).

.EXAMPLE
  .\scripts\push-master.ps1 -Message "fix: netlify publish path"
.EXAMPLE
  .\scripts\push-master.ps1 -Message "chore: sync" -BackupUploads
.EXAMPLE
  .\scripts\push-master.ps1 -BackupUploads -BackupCopyTo "$env:USERPROFILE\YandexDisk\trublebubble-uploads"
.EXAMPLE
  .\scripts\push-master.ps1 -NoPull
#>
param(
  [string] $Message = "",
  [string] $Branch = "master",
  [switch] $NoPull,
  [switch] $BackupUploads,
  [string] $BackupCopyTo = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

function Test-GitRepo {
  if (-not (Test-Path (Join-Path $repoRoot ".git"))) {
    Write-Error "Не найден .git в $repoRoot"
    exit 1
  }
}

Test-GitRepo

$current = (git rev-parse --abbrev-ref HEAD).Trim()
if ($current -ne $Branch) {
  Write-Error "Сейчас ветка «$current», а скрипт пушит «$Branch». Переключитесь: git checkout $Branch"
  exit 1
}

if ($BackupUploads) {
  $copyArg = @{ RepoRoot = $repoRoot }
  if ($BackupCopyTo.Trim()) {
    $copyArg.CopyTo = $BackupCopyTo.Trim()
  }
  & "$PSScriptRoot\backup-uploads.ps1" @copyArg
}

if (-not $NoPull) {
  Write-Host "git pull --rebase origin $Branch" -ForegroundColor Cyan
  git pull --rebase origin $Branch
}

Write-Host "git add -A" -ForegroundColor Cyan
git add -A

$status = git status --porcelain
if (-not $status) {
  Write-Host "Коммитить нечего — рабочая копия чистая." -ForegroundColor Yellow
  exit 0
}

if (-not $Message.Trim()) {
  $Message = Read-Host "Сообщение коммита"
}
if (-not $Message.Trim()) {
  $Message = "chore: sync $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

Write-Host "git commit -m ..." -ForegroundColor Cyan
git commit -m $Message

Write-Host "git push origin $Branch" -ForegroundColor Cyan
git push origin $Branch

Write-Host "Готово." -ForegroundColor Green
