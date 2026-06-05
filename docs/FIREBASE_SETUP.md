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

# 🔥 Firebase Google Login Setup

> A-Z Firebase setup for CashNest X Android Google login and multi-device UID identity.

---
## 🎯 What Firebase does in this project

Firebase is used only for **Google login identity**. It gives the app a Firebase ID token and Firebase UID. The backup file is not stored in Firebase. The encrypted backup is stored in Cloudflare Workers KV.

```text
Google account → Firebase UID → Cloudflare Worker verifies token → Workers KV user backup
```

## 1️⃣ Create/open Firebase project

1. Open https://console.firebase.google.com/
2. Tap **Add project** or open your project.
3. Use a simple project ID, for example:

```text
cashnest-x
```

## 2️⃣ Add Android app

Firebase Console:

```text
Project settings → General → Your apps → Android
```

Use the exact package name from `capacitor.config.json`:

```text
com.cashnest_x.pub
```

Do not use a different package unless you also change `VITE_APP_PACKAGE_NAME` and rebuild.

## 3️⃣ Add SHA-1 fingerprint

Generate release SHA-1 from your keystore:

```bash
keytool -list -v   -keystore cashnest-release.jks   -alias cashnest   -storepass change-this-strong-password   | grep SHA1
```

Paste it in:

```text
Firebase → Project settings → General → Android app → Add fingerprint
```

## 4️⃣ Enable Google provider

```text
Firebase → Authentication → Sign-in method → Google → Enable
```

Select support email and save.

## 5️⃣ Add Web app

```text
Project settings → General → Your apps → Web icon </>
```

Nickname:

```text
CashNest X Web
```

Copy Firebase config values:

```env
VITE_FIREBASE_API_KEY=apiKey
VITE_FIREBASE_PROJECT_ID=projectId
VITE_FIREBASE_AUTH_DOMAIN=authDomain
```

## 6️⃣ Find Web Client ID

Inside Firebase, after Google provider is enabled:

```text
Authentication → Sign-in method → Google → Web SDK configuration
```

Copy the Client ID ending with:

```text
.apps.googleusercontent.com
```

Use it for both names:

```env
VITE_FIREBASE_WEB_CLIENT_ID=xxxxx.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

If you cannot see it on phone, enable browser **Desktop site** and rotate landscape.

## 7️⃣ Confirm Google Cloud OAuth clients

Open https://console.cloud.google.com/apis/credentials with the same Gmail/project.

You should have:

| OAuth client | Required value |
| --- | --- |
| 🌐 Web client | Used for `VITE_FIREBASE_WEB_CLIENT_ID`. |
| 📱 Android client | Package `com.cashnest_x.pub` + release SHA-1. |

## 8️⃣ Add GitHub secrets

```text
GitHub repo → Settings → Secrets and variables → Actions → Secrets
```

Add:

```env
VITE_ENABLE_FIREBASE_AUTH=true
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_WEB_CLIENT_ID=...
VITE_GOOGLE_CLIENT_ID=...
```

## 9️⃣ Common Firebase login errors

| Error | Fix |
| --- | --- |
| `Missing VITE_FIREBASE_WEB_CLIENT_ID` | Add Web Client ID to GitHub Secrets and rebuild. |
| `Google ID token missing` | Add Android OAuth client with package + release SHA-1. |
| `OPERATION_NOT_ALLOWED` | Enable Google provider in Firebase Auth. |
| `INVALID_API_KEY` | Copy Firebase Web API key again. |
| Login works debug, fails release | Add release keystore SHA-1, not debug SHA-1. |

## 🔟 Final Firebase checklist

- [ ] Firebase project created.
- [ ] Android app package matches `com.cashnest_x.pub`.
- [ ] Release SHA-1 added.
- [ ] Google provider enabled.
- [ ] Web app added.
- [ ] Web Client ID copied.
- [ ] GitHub Secrets added.
- [ ] APK rebuilt after secrets were added.

---

## 📖 Book navigation

| ⬅️ Previous | 🏠 Index | Next ➡️ |
| --- | --- | --- |
| [⚙️ Setup A-Z](SETUP.md) | [📚 Documentation Home](README.md) | [☁️ KV Backup](CLOUD_BACKUP.md) |

⬆️ Back to top • 🪺 CashNest X docs rotate like a book.
