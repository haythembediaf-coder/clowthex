# ClowtheX - تطبيق إدارة محل الملابس

تطبيق Android احترافي لإدارة مخزون محلات الملابس الرجالية مع نقاط البيع والتقارير.

## المميزات

- **يعمل بدون إنترنت 100%** - قاعدة بيانات محلية IndexedDB
- **إدارة المخزون** - إضافة وتعديل وحذف المنتجات مع الصور والباركود
- **نقطة البيع (POS)** - واجهة بيع سريعة مع حساب الأرباح
- **التقارير** - إحصائيات المبيعات والمخزون
- **الباركود والQR** - توليد ومسح الباركود
- **دعم العربية والفرنسية والإنجليزية**
- **وضع ليلي وصباحي**
- **دعم العملة** - دينار جزائري وأورو

## تحميل APK

اذهب إلى [Releases](../../releases) لتحميل آخر إصدار من APK.

أو اذهب إلى [Actions](../../actions) وحمّل APK من آخر build ناجح.

## تطوير المشروع

### المتطلبات
- Node.js 20+
- Java 17+
- Android Studio (للبناء المحلي)

### تثبيت وتشغيل

```bash
# تثبيت التبعيات
npm install

# تشغيل في المتصفح
npm run dev

# بناء للإنتاج
npm run build

# مزامنة مع Android
npx cap sync android

# فتح في Android Studio
npx cap open android
```

### بناء APK تلقائياً

عند كل push إلى main، يتم بناء APK تلقائياً عبر GitHub Actions.
APK متاح في:
- **Actions > Build Android APK > Artifacts**
- **Releases** (عند merge في main)

## الهيكل التقني

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: TailwindCSS + shadcn/ui + Framer Motion
- **Database**: IndexedDB (offline)
- **Android**: Capacitor 6
- **Build**: GitHub Actions

## المطور

**Haythem Group** - جميع الحقوق محفوظة
