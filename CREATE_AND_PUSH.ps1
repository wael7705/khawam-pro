# Create and Push to GitHub - Khawam Pro
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Khawam Pro - GitHub Setup" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Create repository on GitHub" -ForegroundColor Green
Write-Host "Visit: https://github.com/new" -ForegroundColor White
Write-Host "Name: khawam-pro" -ForegroundColor Cyan
Write-Host "Description: Professional printing services platform" -ForegroundColor Cyan
Write-Host "Select: Public or Private" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press ENTER after creating the repository..." -ForegroundColor Yellow
Read-Host ""

Write-Host ""
Write-Host "Step 2: Pushing code to GitHub..." -ForegroundColor Green
Write-Host ""

# Remove old remote
git remote remove origin 2>$null

# Add new remote
git remote add origin https://github.com/wael17705/khawam-pro.git

# Push
git push -u origin main

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Done! Check: https://github.com/wael17705/khawam-pro" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan

