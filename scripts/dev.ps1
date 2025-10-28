# PowerShell script to run both backend and frontend

# Start Backend
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    cd backend
    python main.py
}

# Start Frontend
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    cd frontend
    pnpm dev
}

Write-Host "Backend and Frontend are starting..."
Write-Host "Backend: http://localhost:8000"
Write-Host "Frontend: http://localhost:5173"
Write-Host "Press Ctrl+C to stop"

# Wait for both jobs
try {
    Wait-Job -Job $backendJob, $frontendJob
} finally {
    Stop-Job -Job $backendJob, $frontendJob
    Remove-Job -Job $backendJob, $frontendJob
}

