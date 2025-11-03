# Script to test login with new users
$baseUrl = "https://khawam-pro-production.up.railway.app"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Login with New Users" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$users = @(
    @{username="0966320114"; password="admin123"; name="Admin 1"},
    @{username="+963955773227"; password="khawam-p"; name="Admin 2"},
    @{username="khawam-1@gmail.com"; password="khawam-1"; name="Employee 1"},
    @{username="khawam-2@gmail.com"; password="khawam-2"; name="Employee 2"},
    @{username="khawam-3@gmail.com"; password="khawam-3"; name="Employee 3"},
    @{username="customer@gmail.com"; password="963214"; name="Customer"}
)

$successCount = 0
$failCount = 0

foreach ($user in $users) {
    Write-Host "Testing: $($user.name) ($($user.username))" -ForegroundColor Yellow
    
    try {
        $body = @{
            username = $user.username
            password = $user.password
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
            -Method POST `
            -ContentType "application/json" `
            -Body $body
        
        if ($response.access_token) {
            Write-Host "   SUCCESS!" -ForegroundColor Green
            Write-Host "   Name: $($response.user.name)" -ForegroundColor Gray
            Write-Host "   Type: $($response.user.user_type.name_ar)" -ForegroundColor Gray
            $successCount++
        } else {
            Write-Host "   FAILED: No token" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Host "   FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
    }
    
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Results:" -ForegroundColor Cyan
Write-Host "   Success: $successCount" -ForegroundColor Green
Write-Host "   Failed: $failCount" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Cyan

if ($failCount -eq 0) {
    Write-Host ""
    Write-Host "All users are ready!" -ForegroundColor Green
    exit 0
} else {
    exit 1
}
