# 📤 رفع المشروع على GitHub

## ✅ تم إنجاز الخطوات التالية:

1. ✅ إنشاء Git repository محلياً
2. ✅ إضافة `.gitignore`
3. ✅ إضافة جميع الملفات
4. ✅ Commit: "Initial commit"

## ⚠️ الخطوات المتبقية يدوياً:

### 1. إنشاء Repository على GitHub

اذهب إلى: https://github.com/new

- **Repository name:** `khawam-pro`
- **Description:** Professional printing services platform with dashboard, studio tools, and admin panel
- **Public/Private:** اختر حسب احتياجك
- اضغط "Create repository"

### 2. رفع الكود

```powershell
# إضافة remote
git remote add origin https://github.com/YOUR_USERNAME/khawam-pro.git

# رفع الكود
git push -u origin main
```

### 3. (اختياري) باستخدام GitHub Desktop

1. افتح GitHub Desktop
2. File → Add Local Repository
3. اختار المجلد `khawam-pro`
4. Publish to GitHub
5. اختر اسم `khawam-pro`

---

## 🎯 الكود المطلوب:

```powershell
# بعد إنشاء الـ Repository على GitHub
git remote add origin https://github.com/YOUR_USERNAME/khawam-pro.git
git branch -M main
git push -u origin main
```

---

**⚠️ ملاحظة:** GitHub CLI غير مثبت. استخدم الطرق اليدوية أعلاه.

