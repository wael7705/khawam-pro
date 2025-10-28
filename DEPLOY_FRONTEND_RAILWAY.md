# نشر Frontend على Railway

## الخطوات المطلوبة

### 1. الدفع إلى GitHub
```bash
git add .
git commit -m "Setup Frontend deployment on Railway"
git push origin main
```

### 2. إنشاء Frontend Service على Railway

1. اذهب إلى مشروعك على Railway: https://railway.com
2. في صفحة الـ **Architecture**، اضغط على **+ Create**
3. اختر **GitHub Repo**
4. اختر نفس المستودع (khawam-pro)
5. في الإعدادات:
   - **Source**: اختر المجلد `frontend/`
   - **Root Directory**: `frontend/`
   - **Build Command**: `pnpm install && pnpm run build`
   - **Start Command**: `vite preview --host 0.0.0.0 --port $PORT`

### 3. إعداد Environment Variables

في صفحة Frontend service على Railway:

أضف المتغيرات التالية:
- `VITE_API_URL` = `https://khawam-pro-production.up.railway.app`
- `PORT` = `3000` (سيتم تعيينه تلقائياً من Railway)

### 4. ربط Database مع Backend

1. في صفحة Backend service على Railway
2. اضغط على **Settings** > **Variables**
3. تأكد من وجود `DATABASE_URL` (Railway يقوم بإضافته تلقائياً عندما تربط Postgres)
4. أضف المتغيرات التالية:
   - `SECRET_KEY` = قيمة سرية عشوائية
   - `REMOVE_BG_API_KEY` = مفتاح API الخاص بك
   - `ALGORITHM` = `HS256`
   - `ACCESS_TOKEN_EXPIRE_MINUTES` = `30`

### 5. فحص التطبيق

بعد اكتمال النشر:
- Frontend URL: سيظهر في صفحة الـ service
- Backend API: `https://khawam-pro-production.up.railway.app`
- Database: متصلة تلقائياً عبر `DATABASE_URL`

## ملاحظات مهمة

- Frontend و Backend يعملان كـ services منفصلة
- Database مرتبطة بـ Backend service فقط
- تأكد من أن CORS في Backend يسمح للمصدر الصحيح

