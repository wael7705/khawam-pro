# إعدادات Railway للـ Frontend Service

## ⚙️ إعدادات الخدمة ideal-amazement

### Build & Deploy Settings:
```yaml
Root Directory: frontend
```

### Environment Variables:
```yaml
VITE_API_URL: https://khawam-pro-production.up.railway.app
NODE_ENV: production
```

### Build Command:
```bash
pnpm install && pnpm run build
```

### Start Command:
```bash
vite preview --host 0.0.0.0 --port $PORT
```

---

## 📋 النسخ السريع للـ Environment Variables:

انسخ هذا والصقه في Railway Variables:
```
VITE_API_URL=https://khawam-pro-production.up.railway.app
```

