# PowerShell script to create test orders
Write-Host "Creating test orders with various statuses..." -ForegroundColor Cyan
Write-Host ""

cd backend
python create_test_orders.py

Write-Host "`nDone! Test orders have been created." -ForegroundColor Green

