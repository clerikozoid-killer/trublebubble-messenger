@echo off
setlocal
cd /d "%~dp0.."

if exist "tmp\localtunnel.url" (
  for /f "usebackq delims=" %%i in ("tmp\localtunnel.url") do set "URL=%%i"
  if not "%URL%"=="" (
    echo %URL%
    exit /b 0
  )
)

echo localtunnel URL file is empty or missing.
echo Run: docker compose --profile tunnel-lt up -d --force-recreate localtunnel
echo Then: docker compose logs localtunnel
exit /b 1
