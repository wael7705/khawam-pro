# سكريبت PowerShell لاختبار تسجيل الدخول بالمستخدمين الجدد

$baseUrl = "https://khawam-pro-production.up.railway.app"

Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "🧪 اختبار تسجيل الدخول بالمستخدمين الجدد" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

# قائمة المستخدمين للاختبار
$users = @(
    @{username="0966320114"; password="admin123"; name="مدير 1"},
    @{username="+963955773227"; password="khawam-p"; name="مدير 2"},
    @{username="khawam-1@gmail.com"; password="khawam-1"; name="موظف 1"},
    @{username="khawam-2@gmail.com"; password="khawam-2"; name="موظف 2"},
    @{username="khawam-3@gmail.com"; password="khawam-3"; name="موظف 3"},
    @{username="customer@gmail.com"; password="963214"; name="عميل"}
)

$successCount = 0
$failCount = 0

foreach ($user in $users) {
    Write-Host "🔐 اختبار تسجيل دخول: $($user.name) ($($user.username))" -ForegroundColor Yellow
    
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
            Write-Host "   ✅ نجح تسجيل الدخول!" -ForegroundColor Green
            Write-Host "   👤 الاسم: $($response.user.name)" -ForegroundColor Gray
            Write-Host "   🏷️  النوع: $($response.user.user_type.name_ar)" -ForegroundColor Gray
            $successCount++
        } else {
            Write-Host "   ❌ فشل: لا يوجد token" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Host "   ❌ فشل: $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
    }
    
    Write-Host ""
}

Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "📊 النتيجة النهائية:" -ForegroundColor Cyan
Write-Host "   ✅ نجح: $successCount" -ForegroundColor Green
Write-Host "   ❌ فشل: $failCount" -ForegroundColor Red
Write-Host "=" * 70 -ForegroundColor Cyan

if ($failCount -eq 0) {
    Write-Host ""
    Write-Host "🎉 جميع المستخدمين جاهزون بنجاح!" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "⚠️  بعض المستخدمين فشلوا في تسجيل الدخول" -ForegroundColor Yellow
    exit 1
}

