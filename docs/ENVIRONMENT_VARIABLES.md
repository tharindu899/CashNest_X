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

# 🔐 Environment Variables & Secrets

> Every CashNest X Firebase, Cloudflare, signing, and updater value explained safely.

---
## 🎯 Env rule

Use `.env.example` as template. Never commit real `.env`, `.env.cloudflare.worker`, keystore files, or generated backup keys.

## 📱 App identity

```env
VITE_APP_NAME=CashNest X
VITE_APP_PACKAGE_NAME=com.cashnest_x.pub
```

## 🔥 Firebase Google login

```env
VITE_ENABLE_FIREBASE_AUTH=true
VITE_FIREBASE_API_KEY=your-firebase-web-api-key
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

`VITE_GOOGLE_CLIENT_ID` is kept as a compatibility alias. Use the same Web Client ID in both fields.

## ☁️ Cloudflare KV backup

```env
VITE_CLOUDFLARE_WORKER_URL=https://cashnest-x-backup-api.your-subdomain.workers.dev
VITE_CLOUDFLARE_BACKUP_KEY=your-generated-backup-key
```

## 🔐 GitHub Actions signing secrets

```env
KEYSTORE_BASE64=base64-content-of-jks
STORE_PASSWORD=change-this-strong-password
KEY_ALIAS=cashnest
KEY_PASSWORD=change-this-strong-password
```

## 🔒 Optional private updater

```env
VITE_GITHUB_TOKEN=github-fine-grained-read-token
```

Only needed if the release repo is private and the in-app updater must read release assets.

## 🧾 Cloudflare Worker local output

The deploy script creates `.env.cloudflare.worker` with:

```env
CLOUDFLARE_ACCOUNT_ID=...
WORKER_NAME=cashnest-x-backup-api
KV_NAMESPACE=cashnest-x-backups
KV_NAMESPACE_ID=...
WORKERS_SUBDOMAIN=...
CASHNEST_BACKUP_KEY=...
FIREBASE_PROJECT_ID=...
```

Do not commit the real file.

## ✅ Secret placement table

| Value | Local `.env` | GitHub Secret | Worker Secret | Commit? |
| --- | --- | --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | ✅ | ✅ | ❌ | Example only |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | ✅ | ✅ as `FIREBASE_PROJECT_ID` | Example only |
| `VITE_FIREBASE_WEB_CLIENT_ID` | ✅ | ✅ | ❌ | Example only |
| `VITE_CLOUDFLARE_WORKER_URL` | ✅ | ✅ | ❌ | Example only |
| `VITE_CLOUDFLARE_BACKUP_KEY` | ✅ | ✅ | ✅ as `CASHNEST_BACKUP_KEY` | Never real value |
| `KEYSTORE_BASE64` | ❌ | ✅ | ❌ | Never |
| `STORE_PASSWORD` | ❌ | ✅ | ❌ | Never |

---

## 📖 Book navigation

| ⬅️ Previous | 🏠 Index | Next ➡️ |
| --- | --- | --- |
| [📱 Termux Worker Deploy](TERMUX_WORKER_DEPLOY.md) | [📚 Documentation Home](README.md) | [🏗️ APK Build](BUILD.md) |

⬆️ Back to top • 🪺 CashNest X docs rotate like a book.
