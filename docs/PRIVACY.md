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

# 🔒 Privacy

> What stays local, what goes to Firebase, and what goes to Cloudflare KV.

---
## 🔒 Local-first rule

CashNest X stores ledger data locally on the device. Cloud backup runs only when the user signs in and taps backup or enables automatic KV backup.

## ☁️ What goes to Cloudflare KV

Cloudflare KV stores an encrypted backup payload plus small metadata such as saved time and user email/UID metadata in the Worker response/metadata.

## 🔥 What Firebase sees

Firebase handles Google sign-in identity and issues Firebase tokens. Firebase is not used as the backup database in this ZIP.

## 🧹 What is not used

- Legacy database/auth provider.
- Old backup-provider files.

## 🔁 Multi-device behavior

Same Google account signs into Firebase and receives the same Firebase UID. The Worker uses that UID to read/write the same KV backup.

## 🧾 User safety

- Make a local backup before restore.
- Do not share backup files.
- Use your own Firebase and Cloudflare projects for public distribution.
- Delete app data only after confirming cloud/local backup works.

---

## 📖 Book navigation

| ⬅️ Previous | 🏠 Index | Next ➡️ |
| --- | --- | --- |
| [🛡️ Security](SECURITY.md) | [📚 Documentation Home](README.md) | [✅ Quality Check](QUALITY_CHECK.md) |

⬆️ Back to top • 🪺 CashNest X docs rotate like a book.
