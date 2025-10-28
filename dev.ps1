# PowerShell script to run the project
Write-Host "Starting Khawam Project..." -ForegroundColor Green

# Start Backend in background
Write-Host "Starting Backend..." -ForegroundColor Yellow
$backend = Start-Process python -ArgumentList "backend/main.py" -PassThru -NoNewWindow

# Wait a bit for backend to start
Start-Sleep -Seconds 2

# Start Frontend
Write-Host "Starting Frontend..." -ForegroundColor Blue
cd frontend
pnpm run dev

# Cleanup on exit
Write-Host "Stopping processes..." -ForegroundColor Red
Stop-Process -Id $backend.Id -ErrorAction SilentlyContinue

