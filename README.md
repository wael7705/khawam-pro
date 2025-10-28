# 🚀 مشروع خوام للطباعة والتصميم

## 📋 نظرة عامة
- **Backend:** Python + FastAPI + PostgreSQL
- **Frontend:** Vite + React + TypeScript
- **Package Manager:** pnpm
- **Terminal:** PowerShell

---

## ⚡ التشغيل السريع

### 1️⃣ التثبيت
```powershell
# Install all dependencies
pnpm setup
```

### 2️⃣ إعداد قاعدة البيانات
```powershell
# Create database
psql -U postgres -c "CREATE DATABASE khawam;"

# Load schema
psql -U postgres -d khawam -f KHAWAM_DB.sql
```

### 3️⃣ تشغيل المشروع
```powershell
# من الجذر - أمر واحد لجميع الخدمات
pnpm dev
```

**يفتح تلقائياً:**
- 🌐 Frontend: http://localhost:5173
- 🔧 Backend: http://localhost:8000
- 📊 Dashboard: http://localhost:5173/dashboard

---

## 📁 البنية

```
khawam-pro/
├── backend/                  # FastAPI Backend
│   ├── main.py              # Entry point
│   ├── database.py          # DB connection
│   ├── models.py            # SQLAlchemy models
│   ├── utils.py             # Utilities & helpers
│   ├── requirements.txt     # Python dependencies
│   └── routers/            # API routes
│       ├── products.py     # Products API
│       ├── services.py     # Services API
│       ├── portfolio.py    # Portfolio API
│       ├── studio.py        # Studio tools
│       └── admin.py        # Admin CRUD
│
├── frontend/                # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Pages
│   │   ├── lib/           # Utilities
│   │   └── App.tsx        # Main app
│   └── package.json
│
├── KHAWAM_DB.sql          # Database schema
├── package.json           # Root package
└── pnpm-workspace.yaml    # Workspace config
```

---

## 🎯 المميزات

### واجهة العميل
- ✅ الصفحة الرئيسية: منتجات مميزة، خدمات، أعمالنا
- ✅ الخدمات: عرض جميع الخدمات مع زر "اطلب الآن"
- ✅ المنتجات: معرض كامل للمنتجات
- ✅ أعمالنا: معرض أعمال سابقة
- ✅ الاستيديو: معالج صور احترافي
- ✅ تواصل: صفحة التواصل

### لوحة التحكم (Dashboard)
- ✅ الصفحة الرئيسية: إحصائيات و KPI Cards
- ✅ إدارة الطلبات: عرض وإدارة الطلبات
- ✅ إدارة المنتجات: CRUD كامل
- ✅ إدارة الخدمات: CRUD كامل
- ✅ إدارة الأعمال: CRUD كامل

### الاستيديو
- ✅ إزالة الخلفية (remove.bg API)
- ✅ فلاتر احترافية
- ✅ تكبير/تصغير وتدوير
- ✅ التحكم بالسطوع والتشبع

---

## 🛠️ الأوامر

```powershell
pnpm dev              # تشغيل Backend + Frontend
pnpm dev:backend      # Backend فقط
pnpm dev:frontend     # Frontend فقط
pnpm build            # Build للإنتاج
pnpm setup            # التثبيت الكامل
```

---

## 🔌 API Endpoints

### Public APIs
```
GET  /api/products/                # جميع المنتجات
GET  /api/services/                 # جميع الخدمات
GET  /api/portfolio/                # جميع الأعمال
GET  /api/portfolio/featured        # أعمال مميزة
POST /api/studio/remove-background # إزالة خلفية
```

### Admin APIs
```
GET    /api/admin/products/all     # جميع المنتجات
POST   /api/admin/products         # إضافة منتج
PUT    /api/admin/products/{id}     # تحديث منتج
DELETE /api/admin/products/{id}    # حذف منتج

GET    /api/admin/services/all     # جميع الخدمات
POST   /api/admin/services         # إضافة خدمة
PUT    /api/admin/services/{id}    # تحديث خدمة
DELETE /api/admin/services/{id}    # حذف خدمة

GET    /api/admin/works/all        # جميع الأعمال
POST   /api/admin/works            # إضافة عمل
PUT    /api/admin/works/{id}       # تحديث عمل
DELETE /api/admin/works/{id}      # حذف عمل

GET    /api/admin/orders/all       # جميع الطلبات
PUT    /api/admin/orders/{id}/status # تحديث حالة
POST   /api/admin/upload           # رفع صورة
```

---

## ⚙️ الإعدادات

### Environment Variables
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/khawam
REMOVE_BG_API_KEY=QP2YU5oSDaLwXpzDRKv4fjo9
SECRET_KEY=your-secret-key-here
PORT=8000
```

---

## 🐛 استكشاف الأخطاء

### Database Error
```powershell
# تحقق من تشغيل PostgreSQL
Get-Service -Name postgresql*

# تحقق من .env
# DATABASE_URL صحيح
```

### Port Already in Use
```powershell
# أوقف العملية
Stop-Process -Name python -Force
Stop-Process -Name node -Force
```

### Module Not Found
```powershell
# أعد التثبيت
pnpm setup
```

---

## 📦 النشر على Railway

### 1️⃣ إعداد Repository
```powershell
git init
git add .
git commit -m "Initial commit"
# ارفع على GitHub
```

### 2️⃣ ربط Railway
- اذهب إلى railway.app
- اربط GitHub repository
- أضف PostgreSQL database
- أضف Environment Variables

### 3️⃣ Database Migration
```bash
psql $DATABASE_URL -f KHAWAM_DB.sql
```

### 4️⃣ Deploy
- Railway سيولد التطبيق تلقائياً
- تحقق من Logs

---

## 📈 التحسينات المطبقة

✅ Error Handling شامل في `backend/utils.py`  
✅ Validation للأشكال في Pydantic Models  
✅ Logging مركزي  
✅ Success Response موحد  
✅ Pagination جاهزة للاستخدام  

---

## 📝 ملاحظات
- استخدم `pnpm` دائماً
- PowerShell: استخدم `&&` بدلاً من `;`
- لا تستخدم `curl`

---

## 📧 الدعم
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Frontend: http://localhost:5173
- Dashboard: http://localhost:5173/dashboard

---

**جاهز للاستخدام! 🎉**
