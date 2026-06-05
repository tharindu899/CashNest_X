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

# 🔒 Private GitHub Release Updater

> How the CashNest X update checker reads GitHub Releases safely.

---
## 🎯 What the updater does

The in-app updater checks GitHub Releases for a newer APK. It can work with public releases directly. For private repositories, add a read-only GitHub token.

## 1️⃣ Public repo

No extra token is needed when releases are public.

## 2️⃣ Private repo

Create a fine-grained token with read-only access:

- Repository metadata: read.
- Contents: read.
- Releases/assets: read through contents/API access.

Add it as GitHub Secret:

```env
VITE_GITHUB_TOKEN=github_pat_xxx
```

## 3️⃣ Repo injection

GitHub Actions passes:

```env
VITE_GITHUB_REPO=${{ github.repository }}
```

The Vite config injects it into the app updater code.

## 4️⃣ Safety

- 🔐 Do not hardcode a token in source code.
- 🔐 Use fine-grained token only.
- 🔐 Rotate token if the repo becomes public or token leaks.
- 📦 Keep APK release asset name easy to identify.

## 5️⃣ Test

1. Build v0.1.1.
2. Install it.
3. Publish v0.1.2.
4. Open app.
5. Confirm update modal sees the latest release.

---

## 📖 Book navigation

| ⬅️ Previous | 🏠 Index | Next ➡️ |
| --- | --- | --- |
| [🏗️ APK Build](BUILD.md) | [📚 Documentation Home](README.md) | [🧑‍💻 Developer Guide](DEVELOPER_GUIDE.md) |

⬆️ Back to top • 🪺 CashNest X docs rotate like a book.
