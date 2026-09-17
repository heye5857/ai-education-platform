<# 
.SYNOPSIS
    AI Education Platform 開發環境一鍵啟動腳本
.DESCRIPTION
    自動啟動 Docker 服務、初始化資料庫、啟動 Next.js 開發伺服器
    解決 Windows EPERM 錯誤、環境變數載入問題
#>

Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     AI Education Platform - 開發環境一鍵啟動                  ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# 0. 清理殘留進程 (解決 EPERM)
Write-Host "🧹 清理殘留 Node/Prisma 進程..." -ForegroundColor Cyan
taskkill /F /IM node.exe 2>$null
taskkill /F /IM "Prisma*" 2>$null
Start-Sleep -Seconds 1
Write-Host "✅ 清理完成" -ForegroundColor Green

# 檢查 Docker 是否運行
Write-Host "`n🔍 檢查 Docker 狀態..." -ForegroundColor Cyan
try {
    docker version --format '{{.Server.Version}}' | Out-Null
    Write-Host "✅ Docker 運行中" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker 未運行，請先啟動 Docker Desktop" -ForegroundColor Red
    Write-Host "   請開啟 Docker Desktop 並等待啟動完成後再執行此腳本" -ForegroundColor Yellow
    Read-Host "`n按 Enter 結束..."
    exit 1
}

# 1. 啟動 Docker 服務
Write-Host "`n📦 啟動 PostgreSQL & Redis..." -ForegroundColor Cyan
docker-compose up -d

# 2. 等待資料庫就緒
Write-Host "`n⏳ 等待資料庫就緒..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$ready = $false

while ($attempt -lt $maxAttempts) {
    try {
        $result = docker-compose exec -T postgres pg_isready -U user -d ai_edu 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ 資料庫就緒" -ForegroundColor Green
            $ready = $true
            break
        }
    } catch {}
    $attempt++
    Write-Host "   等待中... ($attempt/$maxAttempts)" -ForegroundColor Yellow
    Start-Sleep -Seconds 2
}

if (-not $ready) {
    Write-Host "❌ 資料庫啟動逾時，請檢查 docker-compose logs postgres" -ForegroundColor Red
    Read-Host "`n按 Enter 結束..."
    exit 1
}

# 3. 檢查/建立環境變數檔案
Write-Host "`n🔧 檢查環境變數..." -ForegroundColor Cyan
$envPath = "apps/web/.env.local"
if (-not (Test-Path $envPath)) {
    Write-Host "⚠️  找不到 .env.local，正在從範例建立..." -ForegroundColor Yellow
    Copy-Item "apps/web/.env.example" $envPath -Force
    
    # 產生 AUTH_SECRET
    $authSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
    
    # 更新 .env.local
    $content = Get-Content $envPath -Raw
    $content = $content -replace 'AUTH_SECRET="generate-with: openssl rand -base64 32"', "AUTH_SECRET=`"$authSecret`""
    $content = $content -replace 'DATABASE_URL="postgresql://user:password@localhost:5432/ai_edu\?schema=public"', 'DATABASE_URL="postgresql://user:password@localhost:5432/ai_edu?schema=public"'
    $content = $content -replace 'REDIS_URL="rediss://default:token@region.upstash.io:6379"', 'REDIS_URL="redis://localhost:6379"'
    Set-Content $envPath $content -Encoding UTF8
    
    Write-Host "✅ 已建立 .env.local 並產生 AUTH_SECRET" -ForegroundColor Green
    Write-Host "`n⚠️  請編輯 apps/web/.env.local 填入 Google OAuth 憑證：" -ForegroundColor Yellow
    Write-Host "   AUTH_GOOGLE_ID=您的 Google Client ID" -ForegroundColor Yellow
    Write-Host "   AUTH_GOOGLE_SECRET=您的 Google Client Secret" -ForegroundColor Yellow
    Write-Host "`n按 Enter 繼續..." -ForegroundColor Cyan
    Read-Host | Out-Null
} else {
    Write-Host "✅ .env.local 已存在" -ForegroundColor Green
}

# 4. 同步 .env 給 Prisma (packages/db 目錄)
Write-Host "`n🔗 同步環境變數給 Prisma..." -ForegroundColor Cyan
Copy-Item "apps/web/.env.local" "packages/db/.env" -Force
Write-Host "✅ 已複製 .env.local → packages/db/.env" -ForegroundColor Green

# 5. 安裝依賴 (若需要)
if (-not (Test-Path "node_modules")) {
    Write-Host "`n📦 安裝依賴..." -ForegroundColor Cyan
    pnpm install
    Write-Host "✅ 依賴安裝完成" -ForegroundColor Green
}

# 6. 初始化資料庫
Write-Host "`n🔧 初始化資料庫..." -ForegroundColor Cyan
Write-Host "   產生 Prisma Client..." -ForegroundColor Cyan
pnpm db:generate

Write-Host "   推送 Schema 到資料庫..." -ForegroundColor Cyan
pnpm db:push

# 7. 填入種子資料 (可選)
if (Test-Path "apps/web/prisma/seed.ts") {
    Write-Host "   填入種子資料..." -ForegroundColor Cyan
    pnpm db:seed
}

# 8. 完成
Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ 開發環境就緒！                                            ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  📋 下一步：                                                  ║" -ForegroundColor Green
Write-Host "║  1. 編輯 apps/web/.env.local 填入 Google OAuth 憑證         ║" -ForegroundColor Green
Write-Host "║  2. 選擇啟動方式：                                            ║" -ForegroundColor Green
Write-Host "║     A) 此視窗直接啟動開發伺服器 (輸入 A)                    ║" -ForegroundColor Green
Write-Host "║     B) 手動開新終端機執行 pnpm dev (輸入 B)                 ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green

$choice = Read-Host "`n請選擇 (A/B) [預設 A]"
if ($choice -ne 'B') {
    Write-Host "`n🚀 啟動開發伺服器..." -ForegroundColor Cyan
    Write-Host "   訪問: http://localhost:3000/login" -ForegroundColor Yellow
    Write-Host "   停止: Ctrl+C" -ForegroundColor Yellow
    Write-Host ""
    cd apps/web
    pnpm dev
} else {
    Write-Host "`n請在新終端機執行:`n  cd apps/web`n  pnpm dev" -ForegroundColor Cyan
    Read-Host "`n按 Enter 結束..."
}