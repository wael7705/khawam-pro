# PowerShell script to connect to Railway PostgreSQL and add rating columns
# Prerequisites: psql must be installed or use Railway CLI

param(
    [string]$RailwayProjectName = "khawam-pro",
    [string]$ServiceName = "postgres"
)

Write-Host "🚂 Connecting to Railway PostgreSQL..." -ForegroundColor Cyan

# Option 1: Using Railway CLI (recommended)
# First, make sure Railway CLI is installed: npm i -g @railway/cli
# Then login: railway login

Write-Host ""
Write-Host "Option 1: Using Railway CLI" -ForegroundColor Yellow
Write-Host "Run these commands:" -ForegroundColor Yellow
Write-Host "  railway login" -ForegroundColor Gray
Write-Host "  railway link" -ForegroundColor Gray
Write-Host "  railway run psql < add_rating_columns.sql" -ForegroundColor Gray
Write-Host ""

# Option 2: Direct connection using connection string from Railway
Write-Host "Option 2: Direct PostgreSQL connection" -ForegroundColor Yellow
Write-Host "1. Go to your Railway project dashboard" -ForegroundColor Gray
Write-Host "2. Select your PostgreSQL service" -ForegroundColor Gray
Write-Host "3. Go to 'Variables' tab" -ForegroundColor Gray
Write-Host "4. Copy the 'DATABASE_URL' or 'POSTGRES_URL'" -ForegroundColor Gray
Write-Host "5. Run:" -ForegroundColor Gray
Write-Host ""
Write-Host '   $env:PGPASSWORD="your_password"' -ForegroundColor Green
Write-Host '   psql -h your_host -U your_user -d your_database -f add_rating_columns.sql' -ForegroundColor Green
Write-Host ""

# Option 3: Using Railway CLI to get connection string
Write-Host "Option 3: Using Railway CLI to get connection string" -ForegroundColor Yellow
Write-Host "  railway variables" -ForegroundColor Gray
Write-Host "  # Find DATABASE_URL or POSTGRES_URL" -ForegroundColor Gray
Write-Host "  # Then use it with psql:" -ForegroundColor Gray
Write-Host '  $connString = railway variables | Select-String "DATABASE_URL"' -ForegroundColor Green
Write-Host '  $connString -replace "postgres://", "postgresql://" | psql' -ForegroundColor Green
Write-Host ""

Write-Host "📝 SQL Commands to run:" -ForegroundColor Cyan
Write-Host @"
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rating INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rating_comment TEXT;
"@ -ForegroundColor Gray

Write-Host ""
Write-Host "✅ After running the SQL, restart your backend service" -ForegroundColor Green

