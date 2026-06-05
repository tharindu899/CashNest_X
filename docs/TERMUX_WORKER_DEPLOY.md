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

# 📱 Termux Cloudflare Worker Deploy

> Deploy CashNest X Cloudflare Workers KV backup API from Android Termux.

---
## 🎯 Why this script exists

CashNest X can deploy the Cloudflare Worker from Android Termux without Wrangler, workerd, or R2 setup.

```text
Termux + curl + Cloudflare REST API → Worker upload + KV binding + secrets
```

## 1️⃣ Install packages

```bash
pkg update && pkg upgrade
pkg install curl jq openssl nodejs git unzip -y
```

## 2️⃣ Run deploy helper

```bash
chmod +x scripts/deploy-cloudflare-worker-termux.sh
./scripts/deploy-cloudflare-worker-termux.sh
```

## 3️⃣ Inputs to prepare

| Needed | Where to get it |
| --- | --- |
| 🔑 Cloudflare API token | Cloudflare → Profile → API Tokens |
| 🔥 Firebase project ID | Firebase → Project settings → Project ID |
| ☁️ Worker name | Use default `cashnest-x-backup-api` |
| 🗃️ KV namespace | Use default `cashnest-x-backups` |

## 4️⃣ Output file

The script writes:

```text
.env.cloudflare.worker
```

Do not commit that real file. Commit only:

```text
.env.cloudflare.worker.example
```

## 5️⃣ Add printed values to GitHub

```env
VITE_CLOUDFLARE_WORKER_URL=...
VITE_CLOUDFLARE_BACKUP_KEY=...
```

## 6️⃣ Health test

```bash
curl -i "$VITE_CLOUDFLARE_WORKER_URL/health"
```

## 7️⃣ No R2 needed

This setup uses Workers KV, not R2. If you see old R2 billing messages, you are using an old script or old docs.

## 8️⃣ Re-run safely

You can re-run the deploy script after code changes. It will update the Worker and reuse the KV namespace when found.

---

## 📖 Book navigation

| ⬅️ Previous | 🏠 Index | Next ➡️ |
| --- | --- | --- |
| [☁️ KV Backup](CLOUD_BACKUP.md) | [📚 Documentation Home](README.md) | [🔐 Env & Secrets](ENVIRONMENT_VARIABLES.md) |

⬆️ Back to top • 🪺 CashNest X docs rotate like a book.
