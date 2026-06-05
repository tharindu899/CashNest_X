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

# 🛡️ Security

> Firebase token verification, Worker backup key, KV user isolation, and secret safety.

---
## 🛡️ Security model

CashNest X uses two checks for cloud backup:

1. 🔥 Firebase ID token proves signed-in user identity.
2. 🔐 `X-CashNest-Backup-Key` proves the app is allowed to call your Worker.

Then the Worker stores data under the Firebase UID.

## 🔥 Firebase token checks

The Worker verifies:

- JWT format.
- RS256 algorithm.
- Firebase signing key.
- Token expiry.
- `aud` equals `FIREBASE_PROJECT_ID`.
- `iss` equals `https://securetoken.google.com/<project-id>`.
- `sub` exists and becomes the user UID.

## ☁️ KV key format

```text
cashnest_x:user:<firebase_uid>
```

## 🔐 Never commit

- `.env`
- `.env.cloudflare.worker`
- `cashnest-release.jks`
- `cashnest-base64.txt`
- real backup keys
- real GitHub tokens
- personal finance exports

## 🔑 Rotate when needed

Rotate these if leaked:

- `CASHNEST_BACKUP_KEY`
- `VITE_CLOUDFLARE_BACKUP_KEY`
- GitHub PAT for updater
- release keystore passwords

## ✅ Safe public values

Firebase Web API key and OAuth Client ID are identifiers used by client apps. They are not enough to access user backups because the Worker also requires a valid Firebase ID token and backup key.

## ⚠️ Important

Do not use one shared Firebase project for unrelated public forks unless you want users to share the same auth project. Fork owners should create their own Firebase project and Cloudflare Worker.

---

## 📖 Book navigation

| ⬅️ Previous | 🏠 Index | Next ➡️ |
| --- | --- | --- |
| [🧾 Export Examples](EXPORT_FILE_EXAMPLES.md) | [📚 Documentation Home](README.md) | [🔒 Privacy](PRIVACY.md) |

⬆️ Back to top • 🪺 CashNest X docs rotate like a book.
