@echo off
chcp 65001 >nul
title AI Education Platform - 開發環境啟動

echo ╔══════════════════════════════════════════════════════════════╗
echo ║     AI Education Platform - 開發環境一鍵啟動                  ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: 檢查 Docker
echo 🔍 檢查 Docker 狀態...
docker version --format "%%{{.Server.Version}}" >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker 未運行，請先啟動 Docker Desktop
    pause
    exit /b 1
)
echo ✅ Docker 運行中

:: 1. 啟動 Docker 服務
echo.
echo 📦 啟動 PostgreSQL & Redis...
docker-compose up -d

:: 2. 等待資料庫就緒
echo.
echo ⏳ 等待資料庫就緒...
set MAX_ATTEMPTS=30
set ATTEMPT=0
:WAIT_DB
set /a ATTEMPT+=1
docker-compose exec -T postgres pg_isready -U user -d ai_edu >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 資料庫就緒
    goto :DB_READY
)
if %ATTEMPT% geq 30 (
    echo ❌ 資料庫啟動逾時，請檢查 docker-compose logs postgres
    pause
    exit /b 1
)
echo    等待中... (%ATTEMPT%/30)
timeout /t 2 /nobreak >nul
goto :WAIT_DB

:DB_READY

:: 3. 檢查環境變數
echo.
echo 🔧 檢查環境變數...
if not exist "apps\web\.env.local" (
    echo ⚠️  找不到 .env.local，正在從範例建立...
    copy "apps\web\.env.example" "apps\web\.env.local" >nul
    
    :: 產生 AUTH_SECRET (使用 PowerShell)
    for /f "delims=" %%a in ('powershell -Command "[Convert]::ToBase64String((1..32 ^| ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))"') do set AUTH_SECRET=%%a
    
    :: 更新 .env.local (使用 PowerShell 替換)
    powershell -Command ^
        "$content = Get-Content 'apps/web/.env.local' -Raw; " ^
        "$content = $content -replace 'AUTH_SECRET=\\\"generate-with: openssl rand -base64 32\\\"', 'AUTH_SECRET=\"%AUTH_SECRET%\"'; " ^
        "$content = $content -replace 'REDIS_URL=\\\"rediss://default:token@region.upstash.io:6379\\\"', 'REDIS_URL=\"redis://localhost:6379\"'; " ^
        "Set-Content 'apps/web/.env.local' $content -Encoding UTF8"
    
    echo ✅ 已建立 .env.local 並產生 AUTH_SECRET
    echo.
    echo ⚠️  請編輯 apps\web\.env.local 填入 Google OAuth 憑證：
    echo    AUTH_GOOGLE_ID=您的 Google Client ID
    echo    AUTH_GOOGLE_SECRET=您的 Google Client Secret
    echo.
    pause
) else (
    echo ✅ .env.local 已存在
)

:: 4. 初始化資料庫
echo.
echo 🔧 初始化資料庫...
echo    產生 Prisma Client...
pnpm db:generate

echo    推送 Schema 到資料庫...
pnpm db:push

:: 完成
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  ✅ 開發環境就緒！                                            ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  📋 下一步：                                                  ║
echo ║  1. 編輯 apps\web\.env.local 填入 Google OAuth 憑證         ║
echo ║  2. 執行 pnpm dev 啟動開發伺服器                              ║
echo ║  3. 訪問 http://localhost:3000/login                         ║
echo ╚═════════════════════════════════════════════════════════════╝
pause