# PowerShell script for Railway deployment monitoring
# Usage: .\deploy.ps1

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "  خوام - نشر على Railway" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if Railway CLI is installed
$railwayInstalled = Get-Command railway -ErrorAction SilentlyContinue

if (-not $railwayInstalled) {
    Write-Host "⚠️ Railway CLI not found." -ForegroundColor Yellow
    Write-Host "📦 Installing Railway CLI..." -ForegroundColor Yellow
    npm install -g @railway/cli
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install Railway CLI" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Railway CLI installed successfully" -ForegroundColor Green
}

# Check if git is clean
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "📝 Uncommitted changes detected:" -ForegroundColor Yellow
    Write-Host $gitStatus -ForegroundColor Gray
    Write-Host ""
    $commit = Read-Host "Do you want to commit and push? (y/n)"
    if ($commit -eq "y" -or $commit -eq "Y") {
        $commitMessage = Read-Host "Enter commit message (or press Enter for default)"
        if ([string]::IsNullOrWhiteSpace($commitMessage)) {
            $commitMessage = "Deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        }
        Write-Host "📤 Committing and pushing changes..." -ForegroundColor Yellow
        git add .
        git commit -m $commitMessage
        git push
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to push to GitHub" -ForegroundColor Red
            exit 1
        }
        Write-Host "✅ Code pushed to GitHub" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Skipping commit. Make sure to commit and push manually." -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ No uncommitted changes" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Railway will automatically deploy from GitHub" -ForegroundColor Cyan
Write-Host "📊 Monitor deployment at: https://railway.app" -ForegroundColor Cyan
Write-Host ""

# Ask if user wants to monitor logs
$monitor = Read-Host "Do you want to monitor deployment logs? (y/n)"
if ($monitor -eq "y" -or $monitor -eq "Y") {
    Write-Host ""
    Write-Host "📋 Opening Railway logs (Press Ctrl+C to stop)..." -ForegroundColor Yellow
    railway logs --follow
} else {
    Write-Host ""
    Write-Host "💡 To monitor logs later, run: railway logs --follow" -ForegroundColor Gray
    Write-Host "💡 Or check status: railway status" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ Deployment process completed!" -ForegroundColor Green

