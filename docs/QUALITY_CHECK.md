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

# ✅ Quality Check

> Pre-release test checklist for Firebase login, KV backup, APK build, and docs.

---
## ✅ Pre-release command checklist

```bash
npm run check:worker
npm run release:check
npm run build
```

## 🔥 Firebase checklist

- [ ] `VITE_ENABLE_FIREBASE_AUTH=true`.
- [ ] Web API key added.
- [ ] Project ID added.
- [ ] Auth domain added.
- [ ] Web Client ID added.
- [ ] Android OAuth package matches APK package.
- [ ] Release SHA-1 added.
- [ ] Google provider enabled.

## ☁️ Cloudflare checklist

- [ ] Worker health endpoint works.
- [ ] KV namespace exists.
- [ ] `BACKUP_KV` binding exists.
- [ ] `CASHNEST_BACKUP_KEY` set.
- [ ] `FIREBASE_PROJECT_ID` set.
- [ ] App GitHub secrets include Worker URL and backup key.

## 📲 APK manual checklist

- [ ] APK installs cleanly.
- [ ] App opens without blank screen.
- [ ] Google login opens account picker.
- [ ] Login succeeds.
- [ ] Manual KV backup saves.
- [ ] Restore confirmation opens.
- [ ] Restore works on same device.
- [ ] Restore works on second device with same account.
- [ ] Local backup/export still works.
- [ ] Sign out clears session UI.

## 📚 Docs checklist

- [ ] README has banner/badges/download link.
- [ ] Docs use book navigation bottom links.
- [ ] No legacy cloud provider setup remains.
- [ ] No old backup-provider setup remains.
- [ ] Cloudflare docs say KV, not R2.

---

## 📖 Book navigation

| ⬅️ Previous | 🏠 Index | Next ➡️ |
| --- | --- | --- |
| [🔒 Privacy](PRIVACY.md) | [📚 Documentation Home](README.md) | [🧯 Troubleshooting](TROUBLESHOOTING.md) |

⬆️ Back to top • 🪺 CashNest X docs rotate like a book.
