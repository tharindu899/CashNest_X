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

# 📚 CashNest X Documentation Center

> A modern, book-style documentation set for Firebase Google login + Cloudflare Workers KV backup.

---
## 🧭 Read this folder like a book

| Order | Document | What it teaches |
| --- | --- | --- |
| 1️⃣ | [`SETUP.md`](SETUP.md) | Full CashNest X setup from clone to APK. |
| 2️⃣ | [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md) | Firebase project, Google provider, Web Client ID, Android OAuth, SHA-1. |
| 3️⃣ | [`CLOUD_BACKUP.md`](CLOUD_BACKUP.md) | Cloudflare Worker + Workers KV backup/restore A-Z. |
| 4️⃣ | [`TERMUX_WORKER_DEPLOY.md`](TERMUX_WORKER_DEPLOY.md) | Deploy the Worker from Android Termux with curl. |
| 5️⃣ | [`ENVIRONMENT_VARIABLES.md`](ENVIRONMENT_VARIABLES.md) | Every env/secret value and where it belongs. |
| 6️⃣ | [`BUILD.md`](BUILD.md) | GitHub Actions signed APK and release flow. |
| 7️⃣ | [`PRIVATE_REPO_UPDATER.md`](PRIVATE_REPO_UPDATER.md) | In-app update checker for GitHub Releases. |
| 8️⃣ | [`DEVELOPER_GUIDE.md`](DEVELOPER_GUIDE.md) | App architecture and safe edit rules. |
| 9️⃣ | [`FEATURES.md`](FEATURES.md) | Feature list. |
| 🔟 | [`USER_GUIDE.md`](USER_GUIDE.md) | User-facing guide. |
| 1️⃣1️⃣ | [`EXPORT_FILE_EXAMPLES.md`](EXPORT_FILE_EXAMPLES.md) | Export and backup file examples. |
| 1️⃣2️⃣ | [`SECURITY.md`](SECURITY.md) | Secrets, Firebase token, Worker key, encrypted backup. |
| 1️⃣3️⃣ | [`PRIVACY.md`](PRIVACY.md) | What data stays local and what cloud backup stores. |
| 1️⃣4️⃣ | [`QUALITY_CHECK.md`](QUALITY_CHECK.md) | Pre-release checklist. |
| 1️⃣5️⃣ | [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) | Fix login/build/backup errors. |
| 1️⃣6️⃣ | [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) | Full emoji file tree. |
| 1️⃣7️⃣ | [`CHANGELOG.md`](CHANGELOG.md) | Change history. |
| 1️⃣8️⃣ | [`RELEASE_NOTES.md`](RELEASE_NOTES.md) | Latest release summary. |

## ✅ Current rule

```text
🔥 Login identity: Firebase Google login
☁️ Cloud backup: Cloudflare Workers KV only
🧹 Removed: legacy database and old backup-provider setup
🔁 Multi-device: Same Google account restores same Firebase UID backup
```

## 🧩 Fast setup route

1. 🔥 Create Firebase project and enable Google sign-in.
2. 📱 Add Android app package `com.cashnest_x.pub`.
3. 🔐 Add release SHA-1 fingerprint.
4. 🌐 Add Firebase Web app and copy Web Client ID.
5. ☁️ Deploy Cloudflare Worker KV from Termux.
6. 🔑 Add GitHub Secrets.
7. 🏗️ Push and build signed APK.
8. 📲 Install on two devices and test same-account restore.

---

## 📖 Book navigation

| ⬅️ Previous | 🏠 Index | Next ➡️ |
| --- | --- | --- |
| [🏠 Main README](../README.md) | [📚 Documentation Home](README.md) | [⚙️ Setup A-Z](SETUP.md) |

⬆️ Back to top • 🪺 CashNest X docs rotate like a book.
