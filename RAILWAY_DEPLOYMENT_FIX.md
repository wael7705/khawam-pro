# إصلاح إعدادات Railway

## المشاكل التي تم إصلاحها

### 1. Dockerfile (`backend/Dockerfile`)

#### التحسينات:
- ✅ إضافة `libpq-dev` للاتصال بـ PostgreSQL
- ✅ تحسين ترتيب COPY للاستفادة من Docker cache
- ✅ إضافة health check للتحقق من حالة التطبيق
- ✅ إضافة متغيرات بيئة Python (`PYTHONUNBUFFERED`, `PYTHONDONTWRITEBYTECODE`)
- ✅ إصلاح CMD لاستخدام shell form بشكل صحيح

#### التغييرات الرئيسية:
```dockerfile
# إضافة libpq-dev للاتصال بـ PostgreSQL
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:${PORT:-8000}/api/health')" || exit 1

# CMD مع shell form للسماح بتوسيع متغير PORT
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --log-level info"]
```

### 2. قاعدة البيانات (`backend/database.py`)

#### التحسينات:
- ✅ دعم متغيرات بيئة متعددة (`DATABASE_URL`, `POSTGRES_URL`, `PGDATABASE`)
- ✅ معالجة أفضل لصيغ الاتصال المختلفة (`postgres://`, `postgresql+psycopg2://`)
- ✅ رسائل توضيحية عند إصلاح صيغة الاتصال

#### التغييرات:
```python
# محاولة عدة متغيرات بيئة
DATABASE_URL = (
    os.environ.get("DATABASE_URL") or 
    os.environ.get("POSTGRES_URL") or 
    os.environ.get("PGDATABASE") or
    os.getenv("DATABASE_URL", "")
)

# إصلاح صيغ الاتصال المختلفة
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
elif DATABASE_URL.startswith("postgresql+psycopg2://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://", 1)
```

### 3. Railway Configuration (`railway.toml`)

#### التحسينات:
- ✅ إضافة health check path
- ✅ إضافة health check timeout

#### التغييرات:
```toml
[deploy]
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
healthcheckPath = "/api/health"
healthcheckTimeout = 100
```

### 4. Health Check Endpoint (`backend/main.py`)

#### التحسينات:
- ✅ اختبار الاتصال بقاعدة البيانات في health check
- ✅ إرجاع معلومات عن حالة قاعدة البيانات
- ✅ إرجاع رقم المنفذ المستخدم

## كيفية التحقق من الإصلاح

### 1. التحقق من Build

```bash
# بناء الصورة محلياً للاختبار
docker build -f backend/Dockerfile -t khawam-test .

# تشغيل الصورة
docker run -p 8000:8000 -e DATABASE_URL="your-db-url" khawam-test
```

### 2. التحقق من Health Check

```bash
# بعد النشر على Railway
curl https://your-app.railway.app/api/health

# يجب أن يعيد:
# {
#   "status": "ok",
#   "message": "API is running",
#   "database": "connected",
#   "port": "8000"
# }
```

### 3. التحقق من Logs على Railway

على Railway Dashboard:
1. اذهب إلى Service → Deployments → Latest
2. تحقق من Logs للتأكد من:
   - ✅ "Database engine created successfully"
   - ✅ "Application ready to serve requests"
   - ✅ لا توجد أخطاء في الاتصال بقاعدة البيانات

## متغيرات البيئة المطلوبة على Railway

تأكد من إعداد المتغيرات التالية على Railway:

### متغيرات مطلوبة:
- `DATABASE_URL` - يتم تعيينه تلقائياً عند إضافة PostgreSQL service
- `PORT` - يتم تعيينه تلقائياً من قبل Railway

### متغيرات اختيارية (لكن موصى بها):
- `SECRET_KEY` - مفتاح التشفير للـ JWT tokens
- `FRONTEND_URL` - رابط الواجهة الأمامية
- `PUBLIC_BASE_URL` - رابط API العام

## استكشاف الأخطاء

### المشكلة: التطبيق لا يبدأ

**التحقق:**
1. تحقق من Logs على Railway
2. تحقق من أن `DATABASE_URL` موجود
3. تحقق من أن PORT يتم تعيينه تلقائياً

**الحل:**
- تأكد من ربط PostgreSQL service بشكل صحيح
- تحقق من أن Dockerfile صحيح

### المشكلة: خطأ في الاتصال بقاعدة البيانات

**التحقق:**
```bash
# في Railway Logs، ابحث عن:
# "Database engine created successfully"
# أو
# "Failed to create database engine"
```

**الحل:**
- تحقق من أن PostgreSQL service يعمل
- تحقق من أن `DATABASE_URL` صحيح
- تحقق من أن قاعدة البيانات متاحة من Railway

### المشكلة: Health check fails

**التحقق:**
```bash
curl https://your-app.railway.app/api/health
```

**الحل:**
- تحقق من أن التطبيق يعمل على المنفذ الصحيح
- تحقق من أن `/api/health` endpoint يعمل
- تحقق من Logs للأخطاء

## ملاحظات مهمة

1. **Build Context**: Dockerfile في `backend/Dockerfile` لكن build context هو project root
2. **PORT**: Railway يعين PORT تلقائياً، لا حاجة لتعيينه يدوياً
3. **DATABASE_URL**: Railway يعينه تلقائياً عند ربط PostgreSQL service
4. **Health Check**: Railway يستخدم `/api/health` للتحقق من حالة التطبيق

## الملفات المعدلة

1. ✅ `backend/Dockerfile` - تحسينات البناء والاتصال
2. ✅ `backend/database.py` - تحسينات الاتصال بقاعدة البيانات
3. ✅ `railway.toml` - إضافة health check
4. ✅ `backend/main.py` - تحسين health check endpoint

