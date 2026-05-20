# Android Permissions & Import/Export Guide

This guide explains how ClowtheX handles file permissions and import/export functionality on Android.

---

## 🔐 Current Permission Strategy

### Permissions Declared
```xml
<!-- Only Camera is needed for barcode scanning -->
<uses-permission android:name="android.permission.CAMERA"/>
<uses-feature android:name="android.hardware.camera" android:required="false"/>
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false"/>
```

### Why NO External Storage Permissions?

**Problem**: Traditional backup apps request `WRITE_EXTERNAL_STORAGE` or `READ_EXTERNAL_STORAGE`.

**Solution**: Use **Cache directory** + **native Android Share sheet**.

#### Export Process
1. **Data Collection**: `collectBackupData()` gathers products, sales, settings from IndexedDB
2. **Temp File Creation**: `Filesystem.writeFile()` → Cache directory (app-scoped, auto-managed)
   - Android automatically cleans Cache when space is needed
   - App retains full control, no Android 10+ restrictions apply
3. **Share Sheet**: `Share.share()` opens native Android dialog
   - User selects destination (Files, email, WhatsApp, etc.)
   - Android OS handles permission delegation
   - File can be shared to any installed app

#### Import Process
1. **File Picker**: HTML `<input type="file">` (browser-managed)
2. **Validation**: `parseBackupFile()` validates JSON structure + data integrity
3. **Atomic Restore**: `restoreBackup()` clears & repopulates IndexedDB in single transaction

**Result**: No external storage permissions needed at all ✅

---

## 🚨 Possible Issues & Solutions

### Issue 1: Export Button Greyed Out / Disabled
**Symptoms**: Export button is disabled or clicking doesn't work

**Causes**:
- App is in the middle of exporting (spinner shows)
- Capacitor Share plugin not initialized
- Android Share sheet timeout

**Solutions**:
```bash
# Check if Share plugin is installed
npm ls @capacitor/share

# If missing, install:
npm install @capacitor/share@^6.0.0

# Rebuild APK:
npm run android:build
```

### Issue 2: "Permission Denied" Error During Export
**Symptoms**: Toast shows "❌ Permission denied"

**Causes**:
- Cache directory permission denied (rare on Android 6+)
- Filesystem plugin not properly initialized
- Device storage is full

**Solutions**:
1. Clear app cache:
   ```bash
   adb shell pm clear com.haythemgroup.clowthex
   ```

2. Check Filesystem plugin:
   ```bash
   npm ls @capacitor/filesystem
   ```

3. Increase device storage or clear space

4. If recurring, update `AndroidManifest.xml`:
   ```xml
   <!-- Add to manifest -->
   <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
       android:maxSdkVersion="32" />
   ```

### Issue 3: Share Sheet Doesn't Open
**Symptoms**: Export starts but Share dialog never appears

**Causes**:
- Share plugin not registered in Capacitor
- Android Share framework unavailable
- Temp file URI is invalid

**Solutions**:
1. Verify plugin is registered in `capacitor.config.ts`:
   ```typescript
   plugins: {
     // Share plugin should be auto-registered
   }
   ```

2. Rebuild and sync:
   ```bash
   npm run android:build
   ```

3. Test in Android Studio logcat:
   ```bash
   adb logcat | grep "ClowtheX\|Share"
   ```

### Issue 4: "File Too Large" Error During Import
**Symptoms**: "❌ File too large (max 50 MB)" toast

**Causes**:
- Backup file is over 50MB (very rare with normal usage)
- Many years of sales data
- Large product images stored in backup

**Solutions**:
1. Export only recent data (see data retention below)
2. Clean up old sales records (manually via browser console):
   ```javascript
   // WARNING: This is destructive
   const db = await idb.openDB('style-stock-manager', 2);
   await db.clear('sales'); // Clear all sales
   ```

### Issue 5: Import Fails with "Invalid JSON" or "Corrupted File"
**Symptoms**: Import preview doesn't show, error toast appears

**Causes**:
- File is not a ClowtheX backup
- File was corrupted during transfer
- File encoding is not UTF-8

**Solutions**:
1. Verify file is from ClowtheX:
   ```bash
   # On your computer
   file clowthex-backup-2026-05-20.json
   # Should output: JSON data
   
   # View first 10 lines:
   head -10 clowthex-backup-2026-05-20.json
   # Should show: { "version": 3, "appName": "ClowtheX", ... }
   ```

2. Try with a different backup file

3. If all backups fail, export new one and reimport immediately (test validity)

### Issue 6: Import Succeeds But Data Doesn't Appear
**Symptoms**: Import completes, app reloads, but old data is gone

**Causes**:
- IndexedDB clear/restore succeeded but data wasn't exported to backup
- Empty backup file

**Solutions**:
1. Check IndexedDB in browser console:
   ```javascript
   const db = await idb.openDB('style-stock-manager', 2);
   const products = await db.getAll('products');
   console.log(`${products.length} products found`);
   ```

2. If empty, restore from another backup

3. Always test import on a device with non-critical data first

### Issue 7: Camera Permission Issues (Related to Export/Import Workflow)
**Symptoms**: Barcode scanner doesn't work, but export/import work fine

**Cause**: Camera permission is separate from import/export
- Barcode scanning needs `CAMERA` permission (runtime on Android 6+)
- Import/export uses Cache directory (no special permission)

**Solution**:
1. Tap "Scan Barcode" button
2. Accept permission prompt when asked
3. Allow camera in Settings if denied before:
   - Android Settings → Apps → ClowtheX → Permissions → Camera → Allow

---

## 🛠️ For Developers: Adding New Permissions

If you need to add a new permission (e.g., for new feature):

### Step 1: Add Capacitor Plugin
```bash
npm install @capacitor/your-plugin@^6.0.0
```

### Step 2: Update Build Workflow
Edit `.github/workflows/build-apk.yml`:
```yaml
- name: Add Custom Permissions
  run: |
    M="android/app/src/main/AndroidManifest.xml"
    if ! grep -q "android.permission.YOUR_PERMISSION" "$M"; then
      sed -i 's|</manifest>|    <uses-permission android:name="android.permission.YOUR_PERMISSION"/>\n</manifest>|' "$M"
    fi
```

### Step 3: Handle Runtime Permissions (Android 6+)
If permission needs runtime approval:

```typescript
// src/lib/your-feature.ts
import { Permissions } from "@capacitor/core";

export async function requestYourPermission(): Promise<boolean> {
  try {
    const result = await Permissions.query({ name: "your_permission" });
    
    if (result.state === "granted") {
      return true;
    }
    
    if (result.state === "denied") {
      return false; // User previously denied
    }
    
    // Request permission
    const req = await Permissions.requestMultiple({
      names: ["your_permission"],
    });
    
    return req.results[0].state === "granted";
  } catch (err) {
    console.error("Permission check failed:", err);
    return false;
  }
}

// Usage in component:
const hasPermission = await requestYourPermission();
if (!hasPermission) {
  toast.error("Permission required");
  return;
}
```

### Step 4: Patch MainActivity if Needed
If permission requires WebView interaction (like camera):

Edit `scripts/patch-mainactivity.js`:
```javascript
// Add your permission handler before export
```

---

## 📊 Export/Import Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    ClowtheX App                         │
│  (React + IndexedDB)                                    │
└─────────────────┬───────────────────────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
    EXPORT                IMPORT
         │                 │
    ┌────v────┐      ┌────v────┐
    │ Collect │      │  File   │
    │ Data    │      │  Picker │
    │ (IDB)   │      │         │
    └────┬────┘      └────┬────┘
         │                │
    ┌────v────────────────v────┐
    │ JSON Stringify / Parse   │
    └────┬────────────────┬────┘
         │                │
    ┌────v────┐      ┌────v───────┐
    │ Write   │      │ Validate   │
    │ to      │      │ Structure  │
    │ Cache   │      │ & Content  │
    └────┬────┘      └────┬───────┘
         │                │
    ┌────v────────────────v────┐
    │ Capacitor Filesystem     │
    │ (No Permissions)         │
    └────┬────────────────┬────┘
         │                │
    ┌────v────┐      ┌────v─────┐
    │ Android │      │ Atomic   │
    │ Share   │      │ Restore  │
    │ Sheet   │      │ (IDB tx) │
    └────┬────┘      └────┬─────┘
         │                │
    ┌────v────────────────v────┐
    │ User Selects Destination │
    │ (Files/Email/etc.)       │
    │ Data Saved/Restored      │
    └──────────────────────────┘
```

---

## 📝 Testing Export/Import

### On Android Device
```bash
# Build and deploy
npm run android:build

# In Android Studio or via adb:
adb logcat | grep ClowtheX

# Try export:
# 1. Open Settings page
# 2. Tap Export button
# 3. Select "Files" or "Google Drive"
# 4. Verify file saved

# Try import:
# 1. Create a backup (as above)
# 2. Download to test device
# 3. Open Settings page
# 4. Tap Import button
# 5. Select backup file
# 6. Verify data restored
```

### On Web (http://localhost:8080)
```bash
npm run dev

# Try export:
# 1. Open Settings
# 2. Tap Export button
# 3. Verify download started

# Try import:
# 1. Create a backup
# 2. In Settings, tap Import
# 3. Select file
# 4. Verify preview shows correct counts
```

---

## 🔧 Debugging Tips

### Enable Verbose Logging
Edit `src/lib/backup.ts`:
```typescript
export async function exportBackup(): Promise<ExportResult> {
  console.log("=== EXPORT START ===");
  console.log(`Platform: ${Capacitor.getPlatform()}`);
  // ... rest of function logs as-is
  console.log("=== EXPORT END ===");
}
```

### Check IndexedDB Contents
```javascript
// Browser console
const db = await idb.openDB('style-stock-manager', 2);
console.log("Products:", await db.getAll('products'));
console.log("Sales:", await db.getAll('sales'));
console.log("Settings:", await db.getAll('settings'));
```

### Check Filesystem Plugin Status
```javascript
// Browser console
import { Filesystem, Directory } from "@capacitor/filesystem";
try {
  const result = await Filesystem.getUri({
    path: "test.txt",
    directory: Directory.Cache,
  });
  console.log("Filesystem OK:", result);
} catch (e) {
  console.error("Filesystem Error:", e);
}
```

---

## ✅ Checklist: Before Production Release

- [ ] Export button tested on Android 6, 10, 14+
- [ ] Import accepts valid backups
- [ ] Import rejects invalid files with clear error messages
- [ ] Large backups (10k+ products) export successfully
- [ ] File picker works on all Android versions
- [ ] Native Share sheet opens correctly
- [ ] Error messages are localized (AR/FR/EN)
- [ ] User can cancel export/import gracefully
- [ ] App doesn't crash on network interruption
- [ ] Permissions are requested only when needed

---

**Last Updated**: 2026-05-20
