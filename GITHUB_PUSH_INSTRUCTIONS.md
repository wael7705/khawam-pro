# 🚀 تعليمات رفع المشروع على GitHub

## ✅ تم إعداد المشروع محلياً:

1. ✅ تم تهيئة Git
2. ✅ تم إضافة جميع الملفات
3. ✅ تم عمل Commit
4. ✅ تم حذف المجلدات المتكررة

---

## 📤 خطوات الرفع على GitHub:

### الخطوة 1: إنشاء Repository على GitHub

1. **اذهب إلى:** https://github.com/new

2. **املأ النموذج:**
   - **Repository name:** `khawam-pro`
   - **Description:** `Professional printing services platform with dashboard, studio tools, and admin panel`
   - **Public/Private:** اختر حسب احتياجك
   - **⚠️ لا تختار أي من:** Initialize with README, Add .gitignore, Add license

3. **اضغط "Create repository"**

---

### الخطوة 2: ربط المشروع المحلي بـ GitHub

بعد إنشاء الـ Repository على GitHub، نفّذ هذه الأوامر:

```powershell
# إزالة أي remote موجود
git remote remove origin

# إضافة remote جديد (استبدل YOUR_USERNAME باسمك الحقيقي)
git remote add origin https://github.com/YOUR_USERNAME/khawam-pro.git

# تأكيد أن الفرع هو main
git branch -M main

# رفع الكود
git push -u origin main
```

---

## 🔑 إذا طُلب منك تسجيل الدخول:

### الطريقة 1: باستخدام Personal Access Token

1. **أنشئ Token:**
   - اذهب إلى: https://github.com/settings/tokens
   - اضغط "Generate new token"
   - امنح الصلاحيات: `repo` و `workflow`
   - احفظ الـ Token في مكان آمن

2. **استخدمه عند الرفع:**
   - اسم المستخدم: اسمك على GitHub
   - Password: الـ Token الذي أنشأته

### الطريقة 2: باستخدام GitHub Desktop

1. **ثبّت GitHub Desktop من:** https://desktop.github.com
2. افتح GitHub Desktop
3. File → Add Local Repository
4. اختار المجلد: `C:\Users\waeln\Documents\GitHub\khawam-pro`
5. Publish to GitHub
6. اختر اسم `khawam-pro`
7. اضغط Publish

---

## ✅ بعد الرفع الناجح:

ستتمكن من الوصول إلى المشروع على:
**https://github.com/YOUR_USERNAME/khawam-pro**

---

## 📋 الملفات المرفوعة:

✅ Backend (FastAPI + Python)  
✅ Frontend (React + Vite + TypeScript)  
✅ Database Schema (KHAWAM_DB.sql)  
✅ Dashboard (Admin Panel)  
✅ Studio (Image Processing Tools)  
✅ README.md (Documentation)  
✅ Config Files (.gitignore, package.json, etc.)

---

## 🎯 ملاحظات:

- المشروع جاهز 100%
- تم استبعاد الملفات السرية (.env)
- تم تنظيف المجلدات المتكررة
- الكود منظم وجاهز للعمل

---

**جاهز للرفع! 🎉**

