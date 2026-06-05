<p align="center">
  <img src="../public/banner.svg" alt="CashNest X banner" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/tharindu899/CashNest_X/releases/latest"><img alt="Download latest APK" src="https://img.shields.io/badge/%E2%AC%87%EF%B8%8F%20Download-Latest%20APK-14B8A6?style=for-the-badge" /></a>
  <img alt="Firebase Google" src="https://img.shields.io/badge/Login-Firebase%20Google-FFCA28?logo=firebase&logoColor=111827&style=for-the-badge" />
  <img alt="Cloudflare KV" src="https://img.shields.io/badge/Backup-Cloudflare%20Workers%20KV-F38020?logo=cloudflare&logoColor=white&style=for-the-badge" />
  <img alt="Android APK" src="https://img.shields.io/badge/APK-Capacitor%20Android-119EFF?logo=capacitor&logoColor=white&style=for-the-badge" />
  <img alt="React Vite" src="https://img.shields.io/badge/UI-React%20%2B%20Vite-61DAFB?logo=react&logoColor=111827&style=for-the-badge" />
</p>

# 🏗️ Build Signed APK

> GitHub Actions, release keystore, Firebase SHA-1, and final APK release flow.

---
## 🎯 Build goal

GitHub Actions builds a signed CashNest X APK, injects Firebase/Cloudflare env values, creates release notes, and uploads release assets.

## 1️⃣ Required GitHub secrets

```env
KEYSTORE_BASE64=...
STORE_PASSWORD=...
KEY_ALIAS=cashnest
KEY_PASSWORD=...
VITE_ENABLE_FIREBASE_AUTH=true
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_WEB_CLIENT_ID=...
VITE_GOOGLE_CLIENT_ID=...
VITE_CLOUDFLARE_WORKER_URL=...
VITE_CLOUDFLARE_BACKUP_KEY=...
```

## 2️⃣ Generate release keystore

```bash
keytool -genkeypair -v   -keystore cashnest-release.jks   -alias cashnest   -keyalg RSA   -keysize 2048   -validity 10000   -storepass change-this-strong-password   -keypass change-this-strong-password   -dname "CN=CashNest, OU=App, O=Personal, L=Colombo, S=Western, C=LK"
```

## 3️⃣ Convert keystore to base64

```bash
base64 -w 0 cashnest-release.jks > cashnest-base64.txt
```

Copy `cashnest-base64.txt` content into GitHub secret:

```text
KEYSTORE_BASE64
```

## 4️⃣ Get release SHA-1

```bash
keytool -list -v   -keystore cashnest-release.jks   -alias cashnest   -storepass change-this-strong-password   | grep SHA1
```

Paste SHA-1 into Firebase Android app and Google Cloud Android OAuth client.

## 5️⃣ Build locally

```bash
npm install
npm run check:worker
npm run release:check
npm run build
npx cap sync android
```

## 6️⃣ Push release

```bash
./push.sh "add firebase google login; update cloudflare kv backup; refresh release docs"
```

## 7️⃣ Release assets

Expected GitHub Release assets:

| Asset | Purpose |
| --- | --- |
| `CashNest-X-v*.apk` | Install APK. |
| `release-notes.md` | Generated release notes. |
| checks/logs | Build troubleshooting. |

## 8️⃣ Build verification

- ✅ APK installs.
- ✅ Google login opens account chooser.
- ✅ Firebase session connects.
- ✅ KV backup saves.
- ✅ Restore works on second device.
- ✅ Local backup/export still works.

---

## 📖 Book navigation

| ⬅️ Previous | 🏠 Index | Next ➡️ |
| --- | --- | --- |
| [🔐 Env & Secrets](ENVIRONMENT_VARIABLES.md) | [📚 Documentation Home](README.md) | [🔒 Private Updater](PRIVATE_REPO_UPDATER.md) |

⬆️ Back to top • 🪺 CashNest X docs rotate like a book.
