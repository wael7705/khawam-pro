# 🚀 Railway Deployment Script - Khawam Pro
# This script automates the deployment to Railway

Write-Host "🚀 Starting Railway Deployment for Khawam Pro..." -ForegroundColor Green

# Step 1: Check if logged in to Railway
Write-Host "`n[Step 1/7] Checking Railway CLI installation..." -ForegroundColor Yellow

try {
    $railwayVersion = railway version 2>&1
    Write-Host "✅ Railway CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI not found. Installing..." -ForegroundColor Red
    pnpm add -g @railway/cli
}

# Step 2: Login to Railway
Write-Host "`n[Step 2/7] Logging in to Railway..." -ForegroundColor Yellow
railway login

# Step 3: Initialize Railway project
Write-Host "`n[Step 3/7] Creating Railway project..." -ForegroundColor Yellow
railway init --name khawam

# Step 4: Add PostgreSQL database
Write-Host "`n[Step 4/7] Adding PostgreSQL database..." -ForegroundColor Yellow
railway add --database postgres

# Step 5: Get DATABASE_URL
Write-Host "`n[Step 5/7] Getting DATABASE_URL..." -ForegroundColor Yellow
$DATABASE_URL = railway variables get DATABASE_URL

Write-Host "Database URL: $DATABASE_URL" -ForegroundColor Cyan

# Step 6: Migrate database
Write-Host "`n[Step 6/7] Migrating database..." -ForegroundColor Yellow
Write-Host "Please copy and paste the contents of database/KHAWAM_DB.sql" -ForegroundColor Yellow
Write-Host "Into Railway PostgreSQL Query Panel" -ForegroundColor Yellow

# Step 7: Set environment variables
Write-Host "`n[Step 7/7] Setting environment variables..." -ForegroundColor Yellow

railway variables set `
    REMOVE_BG_API_KEY="QP2YU5oSDaLwXpzDRKv4fjo9" `
    SECRET_KEY="khawam-secret-key-change-in-production" `
    ALGORITHM="HS256" `
    ACCESS_TOKEN_EXPIRE_MINUTES="30" `
    ENVIRONMENT="production"

Write-Host "`n✅ All environment variables set!" -ForegroundColor Green

# Deploy
Write-Host "`n🚀 Deploying to Railway..." -ForegroundColor Green
railway up

Write-Host "`n✅ Deployment Complete!" -ForegroundColor Green
Write-Host "🌐 Your application is live at:" -ForegroundColor Cyan
railway domain

Write-Host "`n📝 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Go to Railway Dashboard" -ForegroundColor White
Write-Host "2. Select your PostgreSQL service" -ForegroundColor White
Write-Host "3. Go to Query panel" -ForegroundColor White
Write-Host "4. Paste contents of database/KHAWAM_DB.sql" -ForegroundColor White
Write-Host "5. Execute the query" -ForegroundColor White

