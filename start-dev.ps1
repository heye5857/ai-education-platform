<#
.SYNOPSIS
    AI Education Platform - One Click Start Dev Environment
.DESCRIPTION
    Auto start Docker, init database, launch Next.js dev server
    Fixes Windows EPERM error, env var loading issues
#>

Write-Host "================================================================" -ForegroundColor Green
Write-Host "  AI Education Platform - One Click Start Dev Environment" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""

# 0. Clean up leftover processes (fix EPERM)
Write-Host "`n[0/7] Cleaning up leftover Node/Prisma processes..." -ForegroundColor Cyan
taskkill /F /IM node.exe 2>$null
taskkill /F /IM "Prisma*" 2>$null
Start-Sleep -Seconds 1
Write-Host "    Done" -ForegroundColor Green

# Check Docker
Write-Host "`n[1/7] Checking Docker status..." -ForegroundColor Cyan
try {
    docker version --format '{{.Server.Version}}' | Out-Null
    Write-Host "    Docker is running" -ForegroundColor Green
} catch {
    Write-Host "    Docker not running. Please start Docker Desktop first." -ForegroundColor Red
    Write-Host "    Open Docker Desktop and wait for it to start, then re-run this script." -ForegroundColor Yellow
    Read-Host "`nPress Enter to exit..."
    exit 1
}

# 1. Start Docker services
Write-Host "`n[2/7] Starting PostgreSQL & Redis..." -ForegroundColor Cyan
docker-compose up -d

# 2. Wait for database ready
Write-Host "`n[3/7] Waiting for database ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$ready = $false

while ($attempt -lt $maxAttempts) {
    try {
        $result = docker-compose exec -T postgres pg_isready -U user -d ai_edu 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    Database ready" -ForegroundColor Green
            $ready = $true
            break
        }
    } catch {}
    $attempt++
    Write-Host "    Waiting... ($attempt/$maxAttempts)" -ForegroundColor Yellow
    Start-Sleep -Seconds 2
}

if (-not $ready) {
    Write-Host "    Database startup timeout. Check: docker-compose logs postgres" -ForegroundColor Red
    Read-Host "`nPress Enter to exit..."
    exit 1
}

# 3. Check/create env file
Write-Host "`n[4/7] Checking environment variables..." -ForegroundColor Cyan
$envPath = "apps/web/.env.local"
if (-not (Test-Path $envPath)) {
    Write-Host "    .env.local not found, creating from example..." -ForegroundColor Yellow
    Copy-Item "apps/web/.env.example" $envPath -Force

    # Generate AUTH_SECRET
    $authSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

    # Update .env.local
    $content = Get-Content $envPath -Raw
    $content = $content -replace 'AUTH_SECRET="generate-with: openssl rand -base64 32"', "AUTH_SECRET=`"$authSecret`""
    $content = $content -replace 'DATABASE_URL="postgresql://user:password@localhost:5432/ai_edu\?schema=public"', 'DATABASE_URL="postgresql://user:password@localhost:5432/ai_edu?schema=public"'
    $content = $content -replace 'REDIS_URL="rediss://default:token@region.upstash.io:6379"', 'REDIS_URL="redis://localhost:6379"'
    Set-Content $envPath $content -Encoding UTF8

    Write-Host "    Created .env.local with AUTH_SECRET" -ForegroundColor Green
    Write-Host "`n    [ACTION REQUIRED] Edit apps/web/.env.local and add Google OAuth credentials:" -ForegroundColor Yellow
    Write-Host "      AUTH_GOOGLE_ID=your-google-client-id" -ForegroundColor Yellow
    Write-Host "      AUTH_GOOGLE_SECRET=your-google-client-secret" -ForegroundColor Yellow
    Write-Host "`n    Press Enter to continue..." -ForegroundColor Cyan
    Read-Host | Out-Null
} else {
    Write-Host "    .env.local exists" -ForegroundColor Green
}

# 4. Sync .env to Prisma (packages/db)
Write-Host "`n[5/7] Syncing env to Prisma..." -ForegroundColor Cyan
Copy-Item "apps/web/.env.local" "packages/db/.env" -Force
Write-Host "    Copied .env.local to packages/db/.env" -ForegroundColor Green

# 5. Install deps if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "`n[6/7] Installing dependencies..." -ForegroundColor Cyan
    pnpm install
    Write-Host "    Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "`n[6/7] Dependencies already installed, skipping" -ForegroundColor Green
}

# 6. Init database
Write-Host "`n[7/7] Initializing database..." -ForegroundColor Cyan
Write-Host "    Generating Prisma Client..." -ForegroundColor Cyan
pnpm db:generate

Write-Host "    Pushing schema to database..." -ForegroundColor Cyan
pnpm db:push

# 7. Seed (optional)
if (Test-Path "apps/web/prisma/seed.ts") {
    Write-Host "    Seeding database..." -ForegroundColor Cyan
    pnpm db:seed
}

# Done
Write-Host "`n================================================================" -ForegroundColor Green
Write-Host "  Dev environment ready!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "  1. Edit apps/web/.env.local with Google OAuth credentials" -ForegroundColor Green
Write-Host "  2. Choose how to start dev server:" -ForegroundColor Green
Write-Host "     A) Start in this window (type A)" -ForegroundColor Green
Write-Host "     B) Manual: open new terminal, run 'cd apps/web && pnpm dev' (type B)" -ForegroundColor Green
Write-Host ""

$choice = Read-Host "`nChoose (A/B) [default A]"
if ($choice -ne 'B') {
    Write-Host "`nStarting dev server..." -ForegroundColor Cyan
    Write-Host "  Visit: http://localhost:3000/login" -ForegroundColor Yellow
    Write-Host "  Stop: Ctrl+C" -ForegroundColor Yellow
    Write-Host ""
    cd apps/web
    pnpm dev
} else {
    Write-Host "`nRun in new terminal:`n  cd apps/web`n  pnpm dev" -ForegroundColor Cyan
    Read-Host "`nPress Enter to exit..."
}