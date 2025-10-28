# Railway Deployment Script
# Run this script to deploy Khawam Pro to Railway

Write-Host "🚀 Deploying Khawam Pro to Railway..." -ForegroundColor Green

# Check if railway is linked
$linked = npx @railway/cli status 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Project not linked. Linking to Railway..." -ForegroundColor Yellow
    npx @railway/cli link
}

Write-Host "✅ Project linked to Railway" -ForegroundColor Green

# Set environment variables
Write-Host "`n📝 Setting environment variables..." -ForegroundColor Yellow

npx @railway/cli variables set REMOVE_BG_API_KEY="QP2YU5oSDaLwXpzDRKv4fjo9"
npx @railway/cli variables set SECRET_KEY="khawam-secret-key-change-in-production"
npx @railway/cli variables set ALGORITHM="HS256"
npx @railway/cli variables set ACCESS_TOKEN_EXPIRE_MINUTES="30"
npx @railway/cli variables set ENVIRONMENT="production"

Write-Host "✅ Environment variables set" -ForegroundColor Green

# Deploy
Write-Host "`n🚀 Deploying..." -ForegroundColor Yellow
npx @railway/cli up

Write-Host "`n✅ Deployment Complete!" -ForegroundColor Green
Write-Host "🌐 Getting your deployment URL..." -ForegroundColor Cyan
npx @railway/cli domain

Write-Host "`n📝 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Go to Railway Dashboard: https://railway.app/projects" -ForegroundColor White
Write-Host "2. Select the 'postgres' service" -ForegroundColor White
Write-Host "3. Go to the 'Query' tab" -ForegroundColor White
Write-Host "4. Copy and paste the contents of database/KHAWAM_DB.sql" -ForegroundColor White
Write-Host "5. Execute the query" -ForegroundColor White

