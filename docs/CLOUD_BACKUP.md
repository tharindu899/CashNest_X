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

# ☁️ Cloudflare Workers KV Backup A-Z

> Full setup for the only CashNest X cloud backup backend: Firebase-authenticated Cloudflare Workers KV.

---
## 🎯 What Cloudflare does

Cloudflare stores the encrypted backup only. Login identity comes from Firebase.

```text
Firebase ID token + CashNest backup key → Cloudflare Worker → Workers KV
```

## ✅ Current cloud rule

| Provider | Status |
| --- | --- |
| ☁️ Cloudflare Workers KV | ✅ Only cloud backup backend. |
| 🔥 Firebase | ✅ Login/token verification only. |
| 🧹 Legacy cloud providers | ❌ Removed. |
| 🧹 Cloudflare R2 | ❌ Not needed. |

## 1️⃣ Create Cloudflare API token

Open https://dash.cloudflare.com/profile/api-tokens

Use permissions that can manage Workers, KV, and scripts for your account. Do not use an R2 S3 key. Do not use a Global API Key.

## 2️⃣ Deploy from Termux

```bash
chmod +x scripts/deploy-cloudflare-worker-termux.sh
./scripts/deploy-cloudflare-worker-termux.sh
```

The script asks for:

| Prompt | Example |
| --- | --- |
| Cloudflare API token | `cf_xxx...` |
| Worker name | `cashnest-x-backup-api` |
| KV namespace | `cashnest-x-backups` |
| Firebase Project ID | `cashnest-x` |

## 3️⃣ What the script creates

- ☁️ Worker script upload.
- 🗃️ Workers KV namespace.
- 🔗 `BACKUP_KV` binding.
- 🔐 `CASHNEST_BACKUP_KEY` Worker secret.
- 🔥 `FIREBASE_PROJECT_ID` Worker secret/variable.
- 🌍 workers.dev route.
- 🧾 `.env.cloudflare.worker` local output file.

## 4️⃣ Add app secrets

Copy printed values to GitHub Actions Secrets:

```env
VITE_CLOUDFLARE_WORKER_URL=https://cashnest-x-backup-api.your-subdomain.workers.dev
VITE_CLOUDFLARE_BACKUP_KEY=generated-backup-key
```

Also keep Firebase values from [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md).

## 5️⃣ How KV keys are scoped

The Worker verifies Firebase token, reads the UID, then stores backup at:

```text
cashnest_x:user:<firebase_uid>
```

So two users cannot read each other’s backup, and the same user can restore on another device.

## 6️⃣ Test health endpoint

```bash
curl -i https://cashnest-x-backup-api.your-subdomain.workers.dev/health
```

Expected JSON includes:

```json
{
  "ok": true,
  "auth": "Firebase Google login",
  "storage": "Cloudflare Workers KV",
  "userScoped": true
}
```

## 7️⃣ Backup/restore app test

1. 📱 Install APK.
2. 👤 Sign in with Google.
3. ☁️ Tap **Cloudflare KV Backup**.
4. 📲 Install same APK on another phone.
5. 👤 Sign in with the same Google account.
6. 🔁 Tap **Restore KV Backup**.

## 8️⃣ Worker files

| File | Purpose |
| --- | --- |
| `cloudflare-worker/src/index.js` | Main Worker code. |
| `cloudflare-worker/worker.js` | Upload entrypoint mirror for Cloudflare API/manual upload. |
| `cloudflare-worker/metadata.json.example` | Manual API upload metadata. |
| `cloudflare-worker/wrangler.toml.example` | Wrangler example. |
| `scripts/deploy-cloudflare-worker-termux.sh` | Main Termux deploy script. |
| `scripts/test-cloudflare-worker.sh` | Health/basic test helper. |

---

## 📖 Book navigation

| ⬅️ Previous | 🏠 Index | Next ➡️ |
| --- | --- | --- |
| [🔥 Firebase Login](FIREBASE_SETUP.md) | [📚 Documentation Home](README.md) | [📱 Termux Worker Deploy](TERMUX_WORKER_DEPLOY.md) |

⬆️ Back to top • 🪺 CashNest X docs rotate like a book.
