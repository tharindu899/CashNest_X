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

# 📝 Release Notes

> Latest release notes for Firebase Google login, KV backup, and documentation cleanup.

---
## 🆕 New release summary

This release turns CashNest X into a clean **Firebase Google login + Cloudflare Workers KV backup** APK.

## ✨ New features

- 🔥 Firebase Google account login.
- 🔁 Multi-device restore with the same Google account.
- ☁️ Cloudflare Workers KV as the only cloud backup backend.
- 🔐 Worker validates Firebase ID tokens before backup/restore.
- 📚 Full modern Markdown docs with banner, badges, download icon, and book navigation.

## 🧹 Cleanup

- Removed old cloud-provider setup from docs and env references.
- Removed old old backup-provider wording.
- Replaced old Google fork guide with `FIREBASE_SETUP.md`.
- Cleaned old public-Google-disabled documentation wording.
- Updated `push.sh` branding.

## ✅ Test plan

```bash
npm run check:worker
npm run release:check
npm run build
```

Manual APK test:

1. Install APK.
2. Sign in with Google.
3. Create sample data.
4. Tap Cloudflare KV Backup.
5. Install on another device.
6. Sign in with same Google account.
7. Restore KV Backup.
8. Confirm data appears.

## 📦 Push command

```bash
./push.sh "add firebase google login docs; update cloudflare kv backup guide; clean old provider docs"
```

---

## 📖 Book navigation

| ⬅️ Previous | 🏠 Index | Next ➡️ |
| --- | --- | --- |
| [📜 Changelog](CHANGELOG.md) | [📚 Documentation Home](README.md) | [🏠 Main README](../README.md) |

⬆️ Back to top • 🪺 CashNest X docs rotate like a book.
