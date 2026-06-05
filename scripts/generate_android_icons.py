from pathlib import Path
from PIL import Image

ROOT = Path.cwd()
RES = ROOT / "android" / "app" / "src" / "main" / "res"
SRC = ROOT / "public" / "icon-1024.png"
if not SRC.exists():
    SRC = ROOT / "public" / "icon-512.png"
if not SRC.exists():
    raise SystemExit("❌ Missing public/icon-1024.png or public/icon-512.png")

src = Image.open(SRC).convert("RGBA")
side = max(src.size)
square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
square.alpha_composite(src, ((side - src.width) // 2, (side - src.height) // 2))
src = square

SIZES = {
    "mipmap-mdpi":    (48,  108),
    "mipmap-hdpi":    (72,  162),
    "mipmap-xhdpi":   (96,  216),
    "mipmap-xxhdpi":  (144, 324),
    "mipmap-xxxhdpi": (192, 432),
}

def fit_icon(img, size, scale):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    target = max(1, int(size * scale))
    icon = img.resize((target, target), Image.LANCZOS)
    canvas.alpha_composite(icon, ((size - target) // 2, (size - target) // 2))
    return canvas

for folder, (launcher_px, fg_px) in SIZES.items():
    path = RES / folder
    path.mkdir(parents=True, exist_ok=True)

    # Legacy icon used by Package Installer / Play Protect previews on many phones.
    legacy = fit_icon(src, launcher_px, 0.98)
    legacy.save(path / "ic_launcher.png", "PNG", optimize=True)
    legacy.save(path / "ic_launcher_round.png", "PNG", optimize=True)

    # Adaptive icon foreground. Larger than old 0.68 scale, still safe for launcher masks.
    fg = fit_icon(src, fg_px, 0.78)
    fg.save(path / "ic_launcher_foreground.png", "PNG", optimize=True)

(RES / "mipmap-anydpi-v26").mkdir(parents=True, exist_ok=True)
for name in ["ic_launcher.xml", "ic_launcher_round.xml"]:
    (RES / "mipmap-anydpi-v26" / name).write_text("""<?xml version=\"1.0\" encoding=\"utf-8\"?>
<adaptive-icon xmlns:android=\"http://schemas.android.com/apk/res/android\">
    <background android:drawable=\"@color/ic_launcher_background\"/>
    <foreground android:drawable=\"@mipmap/ic_launcher_foreground\"/>
</adaptive-icon>
""")

(RES / "values").mkdir(parents=True, exist_ok=True)
(RES / "values" / "ic_launcher_background.xml").write_text("""<?xml version=\"1.0\" encoding=\"utf-8\"?>
<resources>
    <color name=\"ic_launcher_background\">#F97316</color>
</resources>
""")

(RES / "drawable").mkdir(parents=True, exist_ok=True)
(RES / "drawable" / "ic_launcher_background.xml").write_text("""<?xml version=\"1.0\" encoding=\"utf-8\"?>
<shape xmlns:android=\"http://schemas.android.com/apk/res/android\">
    <gradient
        android:startColor=\"#7C3AED\"
        android:centerColor=\"#DB2777\"
        android:endColor=\"#F97316\"
        android:angle=\"315\"/>
</shape>
""")

notification_vector = """<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="48"
    android:viewportHeight="48">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M14,10h20c4.4,0 8,3.6 8,8v2H14c-4.4,0 -8,-2.2 -8,-5s3.6,-5 8,-5z"/>
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M8,19h29c4.4,0 8,3.6 8,8v9c0,4.4 -3.6,8 -8,8H12c-4.4,0 -8,-3.6 -8,-8V23c0,-2.2 1.8,-4 4,-4zM33,29h12v8H33c-2.2,0 -4,-1.8 -4,-4s1.8,-4 4,-4z"/>
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M17,29h3v-2h4v2h3v4h-3v2h3v4h-3v2h-4v-2h-3v-4h3v-2h-3z"/>
</vector>
"""
(RES / "drawable" / "ic_stat_cashnest_x_notification.xml").write_text(notification_vector)
(RES / "drawable-anydpi-v24").mkdir(parents=True, exist_ok=True)
(RES / "drawable-anydpi-v24" / "ic_stat_cashnest_x_notification.xml").write_text(notification_vector)

# Lock-screen / expanded notifications can show a large icon. Keep this in sync
# with the real app icon, while keeping the small status-bar icon as a clean
# white drawable required by Android notifications.
(RES / "drawable-nodpi").mkdir(parents=True, exist_ok=True)
large_icon = fit_icon(src, 256, 0.98)
large_icon.save(RES / "drawable-nodpi" / "ic_cashnest_x_notification_large.png", "PNG", optimize=True)

print("✅ CashNest X Android launcher, adaptive, round, Play Protect preview, notification small icon, and lock-screen large icon regenerated")
