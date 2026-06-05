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

# 📜 Changelog

> Clean change history for the Firebase Google + Cloudflare KV version.

---
## 🚀 Latest cleanup release

### Added

- 🔥 Firebase Google login setup docs.
- ☁️ Firebase-authenticated Cloudflare Workers KV backup docs.
- 🔁 Multi-device sync explanation using Firebase UID.
- 📚 Book-style docs navigation on every Markdown guide.
- 🪪 Modern badges and download badge at the top of docs.
- 🗂️ Full emoji project structure guide.

### Changed

- 🧹 Updated docs from old public-Google-disabled mode to Firebase Google login mode.
- 🧹 Updated backup wording from legacy cloud backup to Cloudflare KV backup.
- 🧹 Updated push helper branding from old project name to CashNest X.
- 🧹 Updated package description.

### Removed

- ❌ Old `GOOGLE_FORK_ENABLE.md` guide.
- ❌ Old legacy cloud setup references.
- ❌ Old old backup-provider setup references.
- ❌ Old R2 backup requirement references.

## Previous important changes

- ✅ Cloudflare Worker verifies Firebase ID tokens.
- ✅ Worker stores backup by Firebase UID.
- ✅ Termux deploy script sets `CASHNEST_BACKUP_KEY` and `FIREBASE_PROJECT_ID`.
- ✅ App backup service sends `Authorization: Bearer <Firebase ID token>`.
- ✅ Encrypted backup payload stays before cloud upload.

---

## 📖 Book navigation

| ⬅️ Previous | 🏠 Index | Next ➡️ |
| --- | --- | --- |
| [🗂️ Full Structure](PROJECT_STRUCTURE.md) | [📚 Documentation Home](README.md) | [📝 Release Notes](RELEASE_NOTES.md) |

⬆️ Back to top • 🪺 CashNest X docs rotate like a book.

- 🛠️ Fixed Capacitor 6 Android Google login compile error by using `androidx.activity.result.ActivityResult`.
