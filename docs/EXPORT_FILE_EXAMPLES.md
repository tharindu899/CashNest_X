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

# 🧾 Export File Examples

> Backup/export file examples and safety notes.

---
## 🧾 Export types

CashNest X can create readable export files and encrypted backup files.

| Type | Purpose | Safe to edit? |
| --- | --- | --- |
| `.cnbak` | Encrypted backup/restore payload | ❌ No |
| `.json` | Developer-readable data export | ⚠️ Carefully |
| `.csv` | Spreadsheet-style transaction export | ✅ Yes |
| `.txt` / `.md` | Human-readable report | ✅ Yes |

## ☁️ Cloud backup envelope

Cloudflare KV receives an encrypted JSON envelope from `createEncryptedBackupContent()`.

Example shape:

```json
{
  "app": "CashNest X",
  "fileName": "CashNest-X-cloudflare-kv-backup.cnbak",
  "savedAt": "2026-06-05T00:00:00.000Z",
  "payload": {
    "encrypted": true,
    "version": 1
  }
}
```

## 📁 Local backup naming

Recommended pattern:

```text
CashNest-X-backup-YYYY-MM-DD-HH-mm.cnbak
```

## 📊 CSV example

```csv
date,type,category,account,amount,currency,note
2026-06-05,expense,Food,Cash,1200,LKR,Lunch
2026-06-05,income,Salary,Bank,150000,LKR,Monthly salary
```

## ✅ Export safety tips

- Keep `.cnbak` files private.
- Do not upload real financial exports to public repos.
- Use cloud backup only from your own Firebase/Cloudflare setup.
- Test restore with sample data before relying on it.

---

## 📖 Book navigation

| ⬅️ Previous | 🏠 Index | Next ➡️ |
| --- | --- | --- |
| [📘 User Guide](USER_GUIDE.md) | [📚 Documentation Home](README.md) | [🛡️ Security](SECURITY.md) |

⬆️ Back to top • 🪺 CashNest X docs rotate like a book.
