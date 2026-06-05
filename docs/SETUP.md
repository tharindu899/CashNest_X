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

# ⚙️ CashNest X Setup A-Z

> Clean setup for Firebase Google login, Cloudflare KV backup, local build, and GitHub release.

---
## 🎯 Goal

Set up CashNest X from a clean ZIP to a signed Android APK with:

- 🔥 Firebase Google login.
- ☁️ Cloudflare Workers KV backup only.
- 🔁 Same Google account multi-device restore.
- 🧾 Local encrypted backup still available offline.
- 🧹 No legacy backup providers.

## 1️⃣ Unzip and install

```bash
unzip CashNest_X_firebase_kv_only_multi_device.zip
cd CashNest_X
npm install
```

## 2️⃣ App identity

Current default package:

```text
com.cashnest_x.pub
```

Files using this identity:

| File | Purpose |
| --- | --- |
| `capacitor.config.json` | Capacitor Android app id and app name. |
| `.env.example` | Local env example. |
| `.github/workflows/build-apk.yml` | GitHub Actions can override package using `VITE_APP_PACKAGE_NAME`. |

Change package only if you also add the same package in Firebase Android app and Google OAuth Android client.

## 3️⃣ Create local env

```bash
cp .env.example .env
```

Minimum working values:

```env
VITE_APP_NAME=CashNest X
VITE_APP_PACKAGE_NAME=com.cashnest_x.pub
VITE_ENABLE_FIREBASE_AUTH=true
VITE_FIREBASE_API_KEY=your-firebase-web-api-key
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
VITE_CLOUDFLARE_WORKER_URL=https://cashnest-x-backup-api.your-subdomain.workers.dev
VITE_CLOUDFLARE_BACKUP_KEY=your-generated-backup-key
```

## 4️⃣ Firebase setup

Read [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md), then add these GitHub secrets:

```env
VITE_ENABLE_FIREBASE_AUTH=true
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_WEB_CLIENT_ID=...
VITE_GOOGLE_CLIENT_ID=...
```

## 5️⃣ Cloudflare KV setup

Read [`CLOUD_BACKUP.md`](CLOUD_BACKUP.md), then run:

```bash
chmod +x scripts/deploy-cloudflare-worker-termux.sh
./scripts/deploy-cloudflare-worker-termux.sh
```

Add printed values to GitHub Secrets:

```env
VITE_CLOUDFLARE_WORKER_URL=...
VITE_CLOUDFLARE_BACKUP_KEY=...
```

The Worker also needs:

```text
CASHNEST_BACKUP_KEY
FIREBASE_PROJECT_ID
BACKUP_KV binding
```

The Termux script sets those automatically.

## 6️⃣ Run checks

```bash
npm run check:worker
npm run release:check
npm run build
```

## 7️⃣ Build Android APK

```bash
npm run build
npx cap sync android
```

For GitHub release APK, push:

```bash
./push.sh "add firebase google login; update cloudflare kv backup; refresh setup docs"
```

## 8️⃣ Test multi-device

1. 📱 Install APK on device A.
2. 👤 Sign in with Google.
3. ☁️ Tap Cloudflare KV Backup.
4. 📱 Install APK on device B.
5. 👤 Sign in with the same Google account.
6. 🔁 Tap Restore KV Backup.
7. ✅ Confirm data appears.

---

## 📖 Book navigation

| ⬅️ Previous | 🏠 Index | Next ➡️ |
| --- | --- | --- |
| [📚 Docs Home](README.md) | [📚 Documentation Home](README.md) | [🔥 Firebase Login](FIREBASE_SETUP.md) |

⬆️ Back to top • 🪺 CashNest X docs rotate like a book.
