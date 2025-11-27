# خيارات إضافة فيديو أو GIF للطباعة

## الخيارات المتاحة:

### 1. GIF من مواقع خارجية (مطبق حالياً)
- **Giphy**: https://giphy.com/
  - مثال: `https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif`
  - البحث عن: "printing machine", "printer", "printing press"
  
- **Tenor**: https://tenor.com/
  - مثال: `https://media.tenor.com/xxxxx/printing.gif`
  
- **مزايا**: سريع، لا يحتاج استضافة، جاهز للاستخدام
- **عيوب**: يعتمد على الموقع الخارجي

### 2. فيديو محلي
```tsx
<video 
  className="services-showcase-video"
  autoPlay
  loop
  muted
  playsInline
>
  <source src="/printing-video.mp4" type="video/mp4" />
  <source src="/printing-video.webm" type="video/webm" />
</video>
```
- ضع الفيديو في `frontend/public/printing-video.mp4`
- **مزايا**: تحكم كامل، لا يعتمد على مواقع خارجية
- **عيوب**: حجم ملف أكبر

### 3. فيديو من YouTube/Vimeo (Embed)
```tsx
<iframe
  className="services-showcase-video"
  src="https://www.youtube.com/embed/VIDEO_ID?autoplay=1&loop=1&mute=1&playlist=VIDEO_ID"
  frameBorder="0"
  allow="autoplay; encrypted-media"
  allowFullScreen
/>
```
- **مزايا**: جودة عالية، استضافة مجانية
- **عيوب**: قد يكون أبطأ في التحميل

### 4. Lottie Animation
```tsx
import Lottie from 'lottie-react';
import printingAnimation from './printing-animation.json';

<Lottie 
  animationData={printingAnimation}
  loop={true}
  className="services-showcase-lottie"
/>
```
- **مزايا**: حجم صغير، سلس جداً
- **عيوب**: يحتاج إنشاء animation

## التوصية:
- **للبدء السريع**: استخدم GIF من Giphy (مطبق حالياً)
- **للجودة**: استخدم فيديو محلي أو من YouTube
- **للأداء**: استخدم Lottie animation

## كيفية التغيير:
1. افتح `frontend/src/pages/Home.tsx`
2. ابحث عن `services-showcase-image-wrapper`
3. استبدل `<img>` بالحل المفضل من أعلاه

