# PowerShell script to connect to Railway PostgreSQL and add rating columns
# Prerequisites: Railway CLI must be installed (npm i -g @railway/cli)

param(
    [string]$RailwayProjectName = "khawam-pro",
    [string]$ServiceName = "postgres"
)

Write-Host "🚂 Adding rating columns to Railway PostgreSQL..." -ForegroundColor Cyan
Write-Host ""

# Check if Railway CLI is installed
$railwayInstalled = Get-Command railway -ErrorAction SilentlyContinue
if (-not $railwayInstalled) {
    Write-Host "❌ Railway CLI not found!" -ForegroundColor Red
    Write-Host "Install it with: npm i -g @railway/cli" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or use Option 2 below for manual connection" -ForegroundColor Yellow
    Write-Host ""
}

# Option 1: Using Railway CLI (Recommended)
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Option 1: Using Railway CLI" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan

if ($railwayInstalled) {
    Write-Host "✅ Railway CLI found!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Step 1: Login to Railway (if not already)" -ForegroundColor Yellow
    Write-Host "  railway login" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Step 2: Link to your project" -ForegroundColor Yellow
    Write-Host "  railway link" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Step 3: Run SQL commands" -ForegroundColor Yellow
    Write-Host "  railway run psql -f add_rating_columns.sql" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Or run commands directly:" -ForegroundColor Yellow
    Write-Host '  railway run psql -c "ALTER TABLE orders ADD COLUMN IF NOT EXISTS rating INTEGER;"' -ForegroundColor Gray
    Write-Host '  railway run psql -c "ALTER TABLE orders ADD COLUMN IF NOT EXISTS rating_comment TEXT;"' -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "Install Railway CLI first:" -ForegroundColor Yellow
    Write-Host "  npm i -g @railway/cli" -ForegroundColor Gray
    Write-Host ""
}

# Option 2: Direct PostgreSQL connection
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Option 2: Direct PostgreSQL Connection" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "1. Go to Railway Dashboard: https://railway.app" -ForegroundColor Gray
Write-Host "2. Select your project: $RailwayProjectName" -ForegroundColor Gray
Write-Host "3. Click on your PostgreSQL service" -ForegroundColor Gray
Write-Host "4. Go to 'Variables' tab" -ForegroundColor Gray
Write-Host "5. Copy 'DATABASE_URL' or 'POSTGRES_URL'" -ForegroundColor Gray
Write-Host ""
Write-Host "Then run:" -ForegroundColor Yellow
Write-Host '  $env:DATABASE_URL="postgresql://user:pass@host:port/dbname"' -ForegroundColor Green
Write-Host '  psql $env:DATABASE_URL -f add_rating_columns.sql' -ForegroundColor Green
Write-Host ""
Write-Host "Or parse the URL and connect:" -ForegroundColor Yellow
Write-Host '  $dbUrl = "postgresql://user:pass@host:port/dbname"' -ForegroundColor Green
Write-Host '  $dbUrl -match "postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)"' -ForegroundColor Green
Write-Host '  $env:PGPASSWORD=$matches[2]' -ForegroundColor Green
Write-Host '  psql -h $matches[3] -p $matches[4] -U $matches[1] -d $matches[5] -f add_rating_columns.sql' -ForegroundColor Green
Write-Host ""

# Option 3: Railway Shell
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Option 3: Railway Shell (Easiest)" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "1. railway login" -ForegroundColor Gray
Write-Host "2. railway link" -ForegroundColor Gray
Write-Host "3. railway shell" -ForegroundColor Gray
Write-Host "4. Select PostgreSQL service" -ForegroundColor Gray
Write-Host "5. Run SQL commands manually:" -ForegroundColor Gray
Write-Host ""
Write-Host "SQL Commands:" -ForegroundColor Yellow
Write-Host "  ALTER TABLE orders ADD COLUMN IF NOT EXISTS rating INTEGER;" -ForegroundColor Green
Write-Host "  ALTER TABLE orders ADD COLUMN IF NOT EXISTS rating_comment TEXT;" -ForegroundColor Green
Write-Host ""

# Direct SQL commands
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SQL Commands (copy and paste):" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
$sqlCommands = @"
-- Add rating column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rating INTEGER;

-- Add rating_comment column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rating_comment TEXT;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('rating', 'rating_comment');
"@
Write-Host $sqlCommands -ForegroundColor Gray
Write-Host ""

Write-Host "✅ After adding columns, restart your backend service" -ForegroundColor Green
Write-Host "   The code will automatically detect and use the new columns" -ForegroundColor Gray

