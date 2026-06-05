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

# 🧯 Troubleshooting

> Fix Firebase login, Cloudflare KV backup, build, release, and mobile console issues.

---
## 🔥 Firebase login problems

| Problem | Fix |
| --- | --- |
| Missing Web Client ID | Add `VITE_FIREBASE_WEB_CLIENT_ID` and rebuild APK. |
| `Google ID token missing` | Add Android OAuth client with package + release SHA-1. |
| `OPERATION_NOT_ALLOWED` | Enable Google provider in Firebase Auth. |
| Works debug, fails release | Add release SHA-1, not only debug SHA-1. |
| Account picker closes | Check Google Play Services and Web Client ID. |

## ☁️ Cloudflare backup problems

| Problem | Fix |
| --- | --- |
| `Unauthorized app key` | App key and Worker `CASHNEST_BACKUP_KEY` do not match. |
| `Missing Firebase Authorization bearer token` | Sign in again; Firebase token missing/expired. |
| `Firebase token audience does not match` | Worker `FIREBASE_PROJECT_ID` is wrong. |
| `KV namespace binding BACKUP_KV is missing` | Re-run deploy script or fix Worker binding. |
| `No backup found` | First backup has not been created for that Google account. |

## 🏗️ Build problems

| Problem | Fix |
| --- | --- |
| `Unable to find expo` | This project is Vite/Capacitor, not Expo. Use `npm run dev` / GitHub Actions. |
| Blank screen | Run `npm run build`; check env injection and console logs. |
| Signing failed | Check keystore base64, passwords, alias. |
| Google error after release | Add release SHA-1 to Firebase/Google OAuth. |

## 📱 Mobile browser Firebase Console issue

If buttons are hidden:

```text
Browser menu → Desktop site ON → rotate landscape → zoom out
```

## 🧪 Quick diagnosis commands

```bash
npm run check:worker
npm run release:check
npm run build
curl -i https://cashnest-x-backup-api.your-subdomain.workers.dev/health
```

---

## 📖 Book navigation

| ⬅️ Previous | 🏠 Index | Next ➡️ |
| --- | --- | --- |
| [✅ Quality Check](QUALITY_CHECK.md) | [📚 Documentation Home](README.md) | [🗂️ Full Structure](PROJECT_STRUCTURE.md) |

⬆️ Back to top • 🪺 CashNest X docs rotate like a book.

## 🛠️ Android build error: `cannot find symbol ActivityResult`

This ZIP uses the Capacitor 6 compatible import:

```java
import androidx.activity.result.ActivityResult;
```

If GitHub Actions shows `import com.getcapacitor.ActivityResult`, the repo still has an older workflow. Upload this fixed ZIP or replace that import in `.github/workflows/build-apk.yml`, then rebuild.
