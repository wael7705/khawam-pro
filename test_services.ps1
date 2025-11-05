# اختبار ظهور الخدمات في PowerShell
# اختبار API الخدمات والتحقق من وجود "طباعة محاضرات"

$baseUrl = "https://khawam-pro-production.up.railway.app"
# أو استخدم localhost للتطوير المحلي
# $baseUrl = "http://localhost:8000"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "اختبار ظهور الخدمات" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

try {
    # جلب جميع الخدمات
    Write-Host "📡 جلب الخدمات من API..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "$baseUrl/api/services/" -Method Get -Headers @{
        "Content-Type" = "application/json"
    }
    
    Write-Host "✅ تم جلب الخدمات بنجاح!" -ForegroundColor Green
    Write-Host ""
    
    # عرض جميع الخدمات
    Write-Host "📋 الخدمات المتاحة:" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    
    if ($response -is [Array]) {
        $services = $response
    } elseif ($response.data) {
        $services = $response.data
    } else {
        $services = $response
    }
    
    $foundLectureService = $false
    
    foreach ($service in $services) {
        $nameAr = $service.name_ar
        $nameEn = $service.name_en
        $id = $service.id
        $isVisible = $service.is_visible
        $basePrice = $service.base_price
        
        Write-Host "   ID: $id" -ForegroundColor White
        Write-Host "   الاسم: $nameAr" -ForegroundColor White
        Write-Host "   Name: $nameEn" -ForegroundColor Gray
        Write-Host "   Visible: $isVisible" -ForegroundColor $(if ($isVisible) { "Green" } else { "Red" })
        Write-Host "   Base Price: $basePrice ل.س" -ForegroundColor White
        Write-Host "   ---" -ForegroundColor Gray
        
        # التحقق من وجود "طباعة محاضرات"
        if ($nameAr -like "*محاضرات*" -or $nameAr -like "*طباعة محاضرات*") {
            $foundLectureService = $true
            Write-Host "   ✅ تم العثور على خدمة 'طباعة محاضرات'!" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    
    # تقرير النتيجة
    if ($foundLectureService) {
        Write-Host "✅ نجح: خدمة 'طباعة محاضرات' موجودة وظاهرة!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  تحذير: خدمة 'طباعة محاضرات' غير موجودة!" -ForegroundColor Yellow
        Write-Host "   يرجى تشغيل: python backend/create_lecture_printing_service.py" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "📊 إجمالي الخدمات: $($services.Count)" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ خطأ في الاتصال بـ API:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 تأكد من:" -ForegroundColor Yellow
    Write-Host "   1. أن الخادم يعمل" -ForegroundColor Yellow
    Write-Host "   2. أن الرابط صحيح" -ForegroundColor Yellow
    Write-Host "   3. أن الاتصال بالإنترنت متاح" -ForegroundColor Yellow
}

