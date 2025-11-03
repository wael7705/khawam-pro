# سكريبت PowerShell لإصلاح قاعدة البيانات وإعادة بناء المستخدمين
# هذا السكريبت يحل مشكلة Foreign Key Constraints ويضيف المستخدمين الجدد

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔧 إصلاح قاعدة البيانات" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# الانتقال إلى مجلد backend
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $scriptPath "backend"
Set-Location -Path $backendPath
Write-Host "📁 المجلد الحالي: $(Get-Location)" -ForegroundColor Green

# التحقق من وجود Python
Write-Host "`n1️⃣ التحقق من Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "   ✅ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Python غير مثبت!" -ForegroundColor Red
    exit 1
}

# التحقق من وجود requirements
Write-Host "`n2️⃣ التحقق من المكتبات المطلوبة..." -ForegroundColor Yellow
if (Test-Path "requirements.txt") {
    Write-Host "   ✅ requirements.txt موجود" -ForegroundColor Green
} else {
    Write-Host "   ❌ requirements.txt غير موجود!" -ForegroundColor Red
    exit 1
}

# تثبيت المكتبات إذا لزم الأمر
Write-Host "`n3️⃣ تثبيت المكتبات..." -ForegroundColor Yellow
python -m pip install -q --upgrade pip
python -m pip install -q psycopg2-binary sqlalchemy passlib[bcrypt] python-dotenv
Write-Host "   ✅ تم تثبيت المكتبات" -ForegroundColor Green

# التحقق من وجود ملف .env أو DATABASE_URL
Write-Host "`n4️⃣ التحقق من DATABASE_URL..." -ForegroundColor Yellow
$envFile = Join-Path $backendPath ".env"
if (Test-Path $envFile) {
    Write-Host "   ✅ ملف .env موجود" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  ملف .env غير موجود" -ForegroundColor Yellow
    Write-Host "   ℹ️  تأكد من أن DATABASE_URL مضبوط في متغيرات البيئة" -ForegroundColor Yellow
}

# تشغيل سكريبت Python
Write-Host "`n5️⃣ تشغيل سكريبت إصلاح قاعدة البيانات..." -ForegroundColor Yellow
Write-Host ""

# استخدام السكريبت المباشر
python fix_db_direct.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ فشل إصلاح قاعدة البيانات!" -ForegroundColor Red
    Write-Host "   تأكد من:" -ForegroundColor Yellow
    Write-Host "   1. DATABASE_URL موجود في .env أو متغيرات البيئة" -ForegroundColor White
    Write-Host "   2. قاعدة البيانات متصلة" -ForegroundColor White
    Write-Host "   3. جميع المكتبات مثبتة" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ تم الانتهاء!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "يمكنك الآن اختبار تسجيل الدخول باستخدام:" -ForegroundColor Yellow
Write-Host "  - مدير 1: 0966320114 / admin123" -ForegroundColor White
Write-Host "  - مدير 2: 963955773227+ / khawam-p" -ForegroundColor White
Write-Host "  - موظف 1: khawam-1@gmail.com / khawam-1" -ForegroundColor White
Write-Host "  - موظف 2: khawam-2@gmail.com / khawam-2" -ForegroundColor White
Write-Host "  - موظف 3: khawam-3@gmail.com / khawam-3" -ForegroundColor White
Write-Host ""
