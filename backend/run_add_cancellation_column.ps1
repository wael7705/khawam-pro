# PowerShell script to add cancellation_reason column to orders table
Write-Host "Adding cancellation_reason column to orders table..." -ForegroundColor Cyan

cd backend
python add_cancellation_reason_column.py

Write-Host "`nDone! Column has been added." -ForegroundColor Green

