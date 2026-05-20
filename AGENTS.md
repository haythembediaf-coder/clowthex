# ClowtheX - Developer Guide for AI Agents

**ClowtheX** is a professional Android clothing store management app built with **React + Capacitor + IndexedDB**. This guide helps AI agents understand the architecture and work efficiently.

---

## 🎯 Project Overview

### What It Does
ClowtheX is a **100% offline** app for managing clothing store inventory, sales (POS), and analytics:
- **Inventory**: CRUD products with categories, images, barcodes
- **POS**: Real-time barcode scanning, cart, invoicing, profit tracking
- **Reports**: Sales analytics, revenue, top products
- **Settings**: Language (Arabic/French/English), theme, store info, backup/restore

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Database**: IndexedDB (offline, local to device)
- **Mobile Bridge**: Capacitor 6 (native Android support)
- **Barcode**: BarcodeDetector API + jsQR fallback + JsBarcode generation
- **Build**: GitHub Actions → APK signing & release

### Key Facts
- **Real Android app**, not a web wrapper (uses Capacitor)
- **100% offline** - no backend needed
- **Multi-language**: Arabic (RTL), French, English
- **Dark mode** support
- **No external storage permissions needed** (uses Cache directory)

---

## 🏗️ Architecture

### File Structure
```
src/
├── pages/               # Full-page components
│   ├── InventoryPage.tsx    # Product CRUD + search
│   ├── POSPage.tsx          # Sales + barcode scanning
│   ├── ReportsPage.tsx      # Analytics & charts
│   └── SettingsPage.tsx     # Settings + import/export ✅
├── components/          # Reusable components
│   ├── BarcodeScanner.tsx   # Camera permission bridge
│   ├── ProductFormDialog.tsx # Product CRUD dialog
│   └── ui/              # shadcn/ui components
├── lib/
│   ├── db.ts            # IndexedDB schema + CRUD ✅
│   ├── backup.ts        # Import/export engine ✅✅
│   ├── qrScanner.ts     # Barcode detection + camera
│   ├── barcode.ts       # JsBarcode generation
│   ├── invoice.ts       # PDF generation
│   └── utils.ts
├── contexts/
│   └── AppContext.tsx   # Global state (lang, theme, currency)
├── hooks/
│   ├── use-mobile.tsx   # Mobile detection
│   └── use-toast.ts     # Toast notifications
└── i18n/
    └── translations.ts  # ar/fr/en texts
```

### State Management
- **AppContext** (React Context): Language, theme, currency, formatting utilities
- **IndexedDB** (via `idb` library): Products, sales, settings (persistent)
- **Component state**: React hooks for UI state (forms, modals, etc.)

### Key Database Schema
```typescript
DB: "style-stock-manager" (v2)

Store: products
├── Index: by-category, by-name, by-barcode
└── Fields: id, name, category, size, color, purchasePrice, salePrice, 
            quantity, lowStockThreshold, image, barcode, createdAt

Store: sales
├── Index: by-date
└── Fields: id, items[], totalAmount, profit, paymentMethod, 
            storeName, createdAt

Store: settings
└── Fields: key (lang, theme, currency, storeName, etc), value
```

---

## 🔐 Permissions & Android Configuration

### Current Permissions
Only **CAMERA** permission is requested (auto-added by build workflow):
```xml
<uses-permission android:name="android.permission.CAMERA"/>
<uses-feature android:name="android.hardware.camera" android:required="false"/>
```

### Import/Export Solution ✅ (NO External Storage Permissions)
**Problem**: Many apps request WRITE_EXTERNAL_STORAGE. **Solution**: Use Cache directory + native Share sheet.

**Export Flow**:
1. `collectBackupData()` gathers products, sales, settings from IndexedDB
2. Write JSON to **Cache directory** (app-scoped, auto-managed, **no permissions**)
3. `Share.share()` opens native Android Share sheet
4. User picks destination (Files app, email, WhatsApp, etc.)
5. Android handles the permission & file transfer

**Import Flow**:
1. `<input type="file">` browser picker (user chooses backup file)
2. `parseBackupFile()` validates JSON structure
3. `restoreBackup()` atomically clears + repopulates IndexedDB

**Key File**: [src/lib/backup.ts](src/lib/backup.ts)

### Camera Permission (Runtime)
**Flow** (handled automatically):
1. User taps "Scan Barcode"
2. `BarcodeScanner.tsx` calls `openRearCamera()`
3. `navigator.mediaDevices.getUserMedia()` → WebView requests permission
4. **Patched MainActivity.java** intercepts & delegates to Android permission system
5. `ContextCompat.checkSelfPermission()` checks; if denied, `ActivityCompat.requestPermissions()`
6. User grants/denies in native dialog
7. Result → WebView (callback: `onRequestPermissionsResult()`)

**Key Files**: 
- [src/components/BarcodeScanner.tsx](src/components/BarcodeScanner.tsx)
- [scripts/patch-mainactivity.js](scripts/patch-mainactivity.js) (auto-generates permission handler)

---

## 🚀 Build & Development

### Local Development
```bash
# Install dependencies
npm install

# Dev server (http://localhost:8080)
npm run dev

# Production build
npm run build

# Sync with Android
npm run cap:sync

# Open Android Studio
npm run cap:open:android

# Watch tests
npm run test:watch
```

### CI/CD (GitHub Actions → APK)
**Trigger**: Push to main, PR, or manual dispatch

**Process**:
1. Node.js 20 + npm install
2. Vite build → `dist/`
3. Java 17 + Android SDK setup
4. `cap add android` (initializes if missing)
5. `cap sync android` (copy web files)
6. `bash scripts/gen-icons.sh` (app icons)
7. **Auto-add CAMERA permission** to AndroidManifest.xml
8. **Patch MainActivity.java** (camera permission handler)
9. Fix black screen on launch (splash color)
10. `./gradlew assembleDebug` + release signing
11. Upload APK to GitHub Releases

**Key File**: [.github/workflows/build-apk.yml](.github/workflows/build-apk.yml)

### Important Scripts
- `scripts/gen-icons.sh`: Generates Android icons
- `scripts/patch-mainactivity.js`: Generates camera permission handler
- `scripts/patch-mainactivity.cjs`: Node wrapper (used by workflow)

---

## 📋 Common Tasks for AI Agents

### Adding a New Permission (if needed)
**❌ DON'T**: Edit AndroidManifest.xml manually (auto-generated by Capacitor)

**✅ DO**:
1. Update [.github/workflows/build-apk.yml](.github/workflows/build-apk.yml) to add the permission during build
2. Add Capacitor plugin to `package.json` if available
3. Update MainActivity.java patch script if permission requires runtime handling
4. Document in this guide

### Adding a New Feature to Inventory/POS
1. Add UI page in `src/pages/`
2. Add state to `AppContext` if global
3. Add IndexedDB operations to `src/lib/db.ts`
4. Add i18n strings to `src/i18n/translations.ts`
5. Add shadcn/ui components as needed
6. Test with `npm run test:watch`

### Modifying Database Schema
1. Increment version in `src/lib/db.ts` (if adding stores)
2. Update `createObjectStore()` with new indexes
3. Migration logic in `getDB()` or separate function
4. Update TypeScript interfaces
5. Export/import logic updates if needed

### Fixing Android-Specific Issues
1. Check [.github/workflows/build-apk.yml](.github/workflows/build-apk.yml) for build steps
2. Check [scripts/patch-mainactivity.js](scripts/patch-mainactivity.js) for WebView config
3. Test locally: `npm run dev` (browser), then `npm run cap:open:android` (Android Studio)
4. Device testing: `npx cap run android` (if Capacitor CLI supports it)

---

## 🎨 Code Conventions

### Naming
- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Database functions: `verb+Noun` (e.g., `getProduct()`, `saveProduct()`)
- React hooks: `use` prefix (e.g., `useApp()`, `useMobile()`)

### Component Patterns
```typescript
// Page component (full screen)
export function InventoryPage() {
  const { t, lang } = useApp();
  return <div>...</div>;
}

// Dialog/Modal component
interface Props { open: boolean; onOpenChange: (open: boolean) => void; }
export function ProductFormDialog({ open, onOpenChange }: Props) {
  return <Dialog open={open} onOpenChange={onOpenChange}>...</Dialog>;
}
```

### Database Transactions
```typescript
// Always use single transaction for related operations
const tx = db.transaction(['products', 'sales'], 'readwrite');
await tx.store('products').get(id);
await tx.store('sales').add(saleData);
await tx.done;
```

### i18n Usage
```typescript
const { t, lang } = useApp();
// Access: t.pages.inventory.title
// Language switch: setLang('fr')
// Auto-saves to IndexedDB
```

### Styling
- TailwindCSS utility classes + `cn()` from `@/lib/utils`
- shadcn/ui components for complex widgets
- Dark mode via `dark:` prefix (applied by `<html class="dark">`)
- RTL support via `html.dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr'`

---

## 🐛 Troubleshooting

### Black Screen on Launch
**Cause**: Android splash screen not configured correctly
**Fix**: Already auto-fixed by workflow (sets splash background color)

### Camera Permission Denied on Android 6+
**Cause**: Runtime permissions not granted
**Fix**: MainActivity.java patch script handles this automatically

### Import/Export Not Working
**Cause**: Cache directory permissions issue
**Fix**: Check if filesystem plugin is installed: `npm ls @capacitor/filesystem`

### Barcode Scanning Not Working
**Cause 1**: Camera permission denied
**Cause 2**: Device doesn't have BarcodeDetector API
**Fix**: Falls back to jsQR decoder (pure JavaScript)

### Sync with Android Failed
**Cause**: Android folder not initialized
**Fix**: `npx cap add android` then `npx cap sync android`

---

## 📝 Key Files to Know

| File | Purpose |
|------|---------|
| [src/contexts/AppContext.tsx](src/contexts/AppContext.tsx) | Global state + i18n |
| [src/lib/db.ts](src/lib/db.ts) | Database CRUD operations |
| [src/lib/backup.ts](src/lib/backup.ts) | Import/export engine |
| [src/pages/SettingsPage.tsx](src/pages/SettingsPage.tsx) | Settings + import/export UI |
| [capacitor.config.ts](capacitor.config.ts) | Capacitor config |
| [.github/workflows/build-apk.yml](.github/workflows/build-apk.yml) | CI/CD pipeline |
| [scripts/patch-mainactivity.js](scripts/patch-mainactivity.js) | Camera permission handler |

---

## ✅ Before You Start

- [ ] Understand IndexedDB schema (see `src/lib/db.ts`)
- [ ] Know the i18n system (see `src/i18n/translations.ts`)
- [ ] Familiar with shadcn/ui components
- [ ] Understand how permissions work (see Permissions section)
- [ ] Know the build process (see CI/CD section)

---

## 📚 Related Documentation

- [Capacitor Documentation](https://capacitorjs.com/)
- [Capacitor Filesystem Plugin](https://capacitorjs.com/docs/apis/filesystem)
- [React Context API](https://react.dev/reference/react/useContext)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [TailwindCSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

---

**Last Updated**: 2026-05-20
