#!/usr/bin/env bash
set -e
sudo apt-get install -y imagemagick librsvg2-bin 2>/dev/null || true
BASE="android/app/src/main/res"
mkdir -p "$BASE/mipmap-mdpi" "$BASE/mipmap-hdpi" "$BASE/mipmap-xhdpi" \
         "$BASE/mipmap-xxhdpi" "$BASE/mipmap-xxxhdpi" \
         "$BASE/mipmap-anydpi-v26" "$BASE/values"

SVG_FILE="/tmp/clowthex_icon.svg"
cat > "$SVG_FILE" << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#0f0f1a"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f5c842"/>
      <stop offset="50%" style="stop-color:#d4a017"/>
      <stop offset="100%" style="stop-color:#b8860b"/>
    </linearGradient>
    <linearGradient id="gold2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffd700"/>
      <stop offset="100%" style="stop-color:#c8960c"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#bg)"/>
  <rect width="512" height="512" rx="100" fill="none" stroke="#d4a017" stroke-width="6" opacity="0.4"/>
  <path d="M 176 180 L 130 215 L 155 250 L 195 225 L 195 370 L 317 370 L 317 225 L 357 250 L 382 215 L 336 180 C 325 210 303 225 256 225 C 209 225 187 210 176 180 Z" fill="url(#gold)" opacity="0.95"/>
  <path d="M 216 178 Q 256 215 296 178 Q 276 200 256 205 Q 236 200 216 178 Z" fill="#b8860b" opacity="0.6"/>
  <rect x="215" y="270" width="46" height="38" rx="4" fill="none" stroke="#b8860b" stroke-width="3" opacity="0.7"/>
  <text x="256" y="420" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="52" font-weight="900" letter-spacing="4" fill="url(#gold2)" opacity="0.95">CX</text>
</svg>
SVGEOF

MASTER="/tmp/clowthex_master.png"
if [ -f "assets/icon.png" ] && file "assets/icon.png" | grep -qi "PNG"; then
  echo "Using user-supplied icon"
  convert "assets/icon.png" -resize 1024x1024 "$MASTER"
else
  echo "Generating icon from SVG"
  if command -v rsvg-convert &>/dev/null; then
    rsvg-convert -w 1024 -h 1024 "$SVG_FILE" -o "$MASTER"
  else
    convert -background none -density 300 "$SVG_FILE" -resize 1024x1024 "$MASTER"
  fi
fi
echo "Master icon: $(ls -lh $MASTER)"

declare -A SIZES=([mipmap-mdpi]=48 [mipmap-hdpi]=72 [mipmap-xhdpi]=96 [mipmap-xxhdpi]=144 [mipmap-xxxhdpi]=192)
for DIR in "${!SIZES[@]}"; do
  S="${SIZES[$DIR]}"
  convert "$MASTER" -resize "${S}x${S}" "$BASE/$DIR/ic_launcher.png"
  convert "$MASTER" -resize "${S}x${S}" "$BASE/$DIR/ic_launcher_round.png"
  echo "  $DIR: ${S}x${S}"
done

declare -A FG_SIZES=([mipmap-mdpi]=108 [mipmap-hdpi]=162 [mipmap-xhdpi]=216 [mipmap-xxhdpi]=324 [mipmap-xxxhdpi]=432)
for DIR in "${!FG_SIZES[@]}"; do
  S="${FG_SIZES[$DIR]}"
  convert "$MASTER" -resize "${S}x${S}" -background '#0f0f1a' -gravity center -extent "${S}x${S}" "$BASE/$DIR/ic_launcher_foreground.png"
done

cat > "$BASE/mipmap-anydpi-v26/ic_launcher.xml" << 'XMLEOF'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
XMLEOF
cp "$BASE/mipmap-anydpi-v26/ic_launcher.xml" "$BASE/mipmap-anydpi-v26/ic_launcher_round.xml"

cat > "$BASE/values/ic_launcher_background.xml" << 'XMLEOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0F0F1A</color>
</resources>
XMLEOF

echo "All icons generated!"
