# Fix Railway Project - Remove Duplicate Databases

Write-Host "🔧 Fixing Railway Project..." -ForegroundColor Yellow

# List all services
Write-Host "`n📋 Current services:" -ForegroundColor Cyan
npx @railway/cli service

# Get DATABASE_URL from one of the postgres services
Write-Host "`n📝 Please manually:" -ForegroundColor Yellow
Write-Host "1. Go to Railway Dashboard" -ForegroundColor White
Write-Host "2. Delete 3 of the 4 PostgreSQL databases (keep only one)" -ForegroundColor White
Write-Host "3. Select the remaining PostgreSQL service" -ForegroundColor White
Write-Host "4. Copy the DATABASE_URL from Variables" -ForegroundColor White
Write-Host "5. Go to Query tab" -ForegroundColor White
Write-Host "6. Paste and execute: database/KHAWAM_DB.sql" -ForegroundColor White

Write-Host "`n✅ After fixing, the project will work correctly" -ForegroundColor Green

