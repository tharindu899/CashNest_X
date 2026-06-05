<p align="center">
  <img src="public/banner.svg" alt="CashNest X banner" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/tharindu899/CashNest_X/releases/latest"><img alt="Download latest APK" src="https://img.shields.io/badge/%E2%AC%87%EF%B8%8F%20Download-Latest%20APK-14B8A6?style=for-the-badge" /></a>
  <img alt="Firebase Google" src="https://img.shields.io/badge/Login-Firebase%20Google-FFCA28?logo=firebase&logoColor=111827&style=for-the-badge" />
  <img alt="Cloudflare KV" src="https://img.shields.io/badge/Backup-Cloudflare%20Workers%20KV-F38020?logo=cloudflare&logoColor=white&style=for-the-badge" />
  <img alt="Android APK" src="https://img.shields.io/badge/APK-Capacitor%20Android-119EFF?logo=capacitor&logoColor=white&style=for-the-badge" />
  <img alt="React Vite" src="https://img.shields.io/badge/UI-React%20%2B%20Vite-61DAFB?logo=react&logoColor=111827&style=for-the-badge" />
</p>

# 🪺 CashNest X — Firebase Google Login + Cloudflare KV Backup

CashNest X is a modern Android money manager built with **React + Vite + Capacitor**. This ZIP is cleaned for the new cloud design: **Firebase Google login only for account identity** and **Cloudflare Workers KV only for encrypted backup/sync**. Old backup-provider code is not used.

---

## ⬇️ Download latest release

<p align="center">
  <a href="https://github.com/tharindu899/CashNest_X/releases/latest"><img alt="Download CashNest X APK" src="https://img.shields.io/badge/%E2%AC%87%EF%B8%8F%20Download%20CashNest%20X-Latest%20GitHub%20Release-14B8A6?style=for-the-badge" /></a>
</p>

> Replace the release URL with your real repository URL if your fork uses a different owner/repo name.

---

## 🧠 Current cloud design

```text
👤 User taps Google Account
        ↓
📱 Native Android Google login returns a Google ID token
        ↓
🔥 Firebase Auth exchanges it for Firebase ID token + Firebase UID
        ↓
☁️ Cloudflare Worker verifies the Firebase ID token
        ↓
🗃️ Workers KV saves encrypted backup under cashnest_x:user:<firebase_uid>
        ↓
📲 Same Google account on another device restores the same backup
```

## ✅ What this ZIP contains

| Area | Status | Notes |
| --- | --- | --- |
| 🔥 Firebase Google login | ✅ Added | Uses Web Client ID + Android OAuth SHA-1. |
| ☁️ Cloudflare Workers KV | ✅ Only cloud backup | One encrypted backup per Firebase UID. |
| 🔁 Multi-device sync | ✅ Added | Same Google account = same Firebase UID = same KV backup. |
| 🧾 Local backup | ✅ Kept | Encrypted local backup/export still works offline. |
| 🧹 Legacy cloud providers | ✅ Removed | Only Firebase login + Cloudflare Workers KV remains. |
| 📚 Docs | ✅ Rebuilt | Modern banner, badges, A-Z setup, book-style navigation. |

## ✨ Main features

- 💸 Income, expense, transfer, account, loan, budget, and category tracking.
- 📊 Analytics, category expense watch, monthly summaries, and charts.
- 🧾 Local encrypted backup, export examples, and restore flow.
- 🔥 Firebase Google account connection for identity.
- ☁️ Cloudflare Worker + Workers KV backup and restore.
- 🔁 Multi-device restore using the same Google account.
- 🔐 PIN/lock utilities and privacy-first local storage.
- 📦 GitHub Actions APK build + release workflow.

## 🚀 Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Android build sync:

```bash
npm run build
npx cap sync android
```

Release checks:

```bash
npm run check:worker
npm run release:check
npm run build
```

## 🔥 Minimum Firebase env

```env
VITE_ENABLE_FIREBASE_AUTH=true
VITE_FIREBASE_API_KEY=your-firebase-web-api-key
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

## ☁️ Minimum Cloudflare KV env

```env
VITE_CLOUDFLARE_WORKER_URL=https://cashnest-x-backup-api.your-workers-subdomain.workers.dev
VITE_CLOUDFLARE_BACKUP_KEY=your-generated-worker-backup-key
```

Deploy Worker from Termux:

```bash
chmod +x scripts/deploy-cloudflare-worker-termux.sh
./scripts/deploy-cloudflare-worker-termux.sh
```

## 🧭 Documentation map

| Order | Guide | Purpose |
| --- | --- | --- |
| 1️⃣ | [📚 Docs Home](docs/README.md) | Read all docs like a book. |
| 2️⃣ | [⚙️ Setup A-Z](docs/SETUP.md) | Full project setup. |
| 3️⃣ | [🔥 Firebase Setup](docs/FIREBASE_SETUP.md) | Google login, Web Client ID, SHA-1. |
| 4️⃣ | [☁️ Cloud Backup](docs/CLOUD_BACKUP.md) | Worker + KV backup/restore. |
| 5️⃣ | [📱 Termux Worker Deploy](docs/TERMUX_WORKER_DEPLOY.md) | Android-only Cloudflare deploy. |
| 6️⃣ | [🔐 Env & Secrets](docs/ENVIRONMENT_VARIABLES.md) | GitHub secrets and local env. |
| 7️⃣ | [🏗️ APK Build](docs/BUILD.md) | GitHub Actions signed release. |
| 8️⃣ | [🗂️ Full Project Structure](docs/PROJECT_STRUCTURE.md) | Every important file explained. |


## 🔗 Needed links

| Tool | Link | Use |
| --- | --- | --- |
| 🔥 Firebase Console | https://console.firebase.google.com/ | Create project, Android app, Web app, Google provider |
| 🔑 Google Cloud Credentials | https://console.cloud.google.com/apis/credentials | Find/create OAuth Web client and Android client |
| ☁️ Cloudflare Dashboard | https://dash.cloudflare.com/ | Create API token, inspect Worker/KV |
| 🧡 Cloudflare Workers KV docs | https://developers.cloudflare.com/kv/ | KV storage reference |
| ⚙️ GitHub Actions Secrets | https://docs.github.com/actions/security-guides/using-secrets-in-github-actions | Add Firebase, Cloudflare, signing values |
| 📱 Capacitor Android docs | https://capacitorjs.com/docs/android | Android APK platform docs |
| ⚡ Vite docs | https://vitejs.dev/guide/ | Local React/Vite build docs |


## 📦 Push command

```bash
./push.sh "add firebase google login docs; update cloudflare kv setup; clean old backup files"
```
