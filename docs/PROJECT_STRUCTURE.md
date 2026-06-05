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

# 🗂️ Project Structure

> Full emoji file tree and important file responsibilities.

---
## 🗂️ Full emoji file tree

```text
🪺 CashNest_X/
├── ⚙️ .github/
│   └── 🤖 workflows/
│       └── 🤖 build-apk.yml
├── ☁️ cloudflare-worker/
│   ├── 💻 src/
│   │   └── 🟨 index.js
│   ├── 📄 metadata.json.example
│   ├── 🧾 package.json
│   ├── 🟨 worker.js
│   └── 📄 wrangler.toml.example
├── 📚 docs/
│   ├── 📘 BUILD.md
│   ├── 📘 CHANGELOG.md
│   ├── 📘 CLOUD_BACKUP.md
│   ├── 📘 DEVELOPER_GUIDE.md
│   ├── 📘 ENVIRONMENT_VARIABLES.md
│   ├── 📘 EXPORT_FILE_EXAMPLES.md
│   ├── 📘 FEATURES.md
│   ├── 📘 FIREBASE_SETUP.md
│   ├── 📘 PRIVACY.md
│   ├── 📘 PRIVATE_REPO_UPDATER.md
│   ├── 📘 PROJECT_STRUCTURE.md
│   ├── 📘 QUALITY_CHECK.md
│   ├── 📘 README.md
│   ├── 📘 RELEASE_NOTES.md
│   ├── 📘 SECURITY.md
│   ├── 📘 SETUP.md
│   ├── 📘 TERMUX_WORKER_DEPLOY.md
│   ├── 📘 TROUBLESHOOTING.md
│   └── 📘 USER_GUIDE.md
├── 🎨 public/
│   ├── 🖼️ photo/
│   │   ├── 📸 d-add.jpg
│   │   ├── 📸 d-analysis.jpg
│   │   ├── 📸 d-home.jpg
│   │   ├── 📸 d-recod.jpg
│   │   ├── 📸 d-setting.jpg
│   │   ├── 📸 l-analysis.jpg
│   │   ├── 📸 l-home.jpg
│   │   ├── 📸 l-recode.jpg
│   │   └── 📸 l-setting.jpg
│   ├── 🖼️ banner.svg
│   ├── 🖼️ favicon.png
│   ├── 🖼️ icon-1024.png
│   ├── 🖼️ icon-192.png
│   ├── 🖼️ icon-512.png
│   ├── 🖼️ icon.svg
│   ├── 📄 manifest.webmanifest
│   └── 🖼️ notification-icon.svg
├── 🛠️ scripts/
│   ├── 🟨 calculation-check.cjs
│   ├── 🟨 deep-check.cjs
│   ├── 🐚 deploy-cloudflare-worker-termux.sh
│   ├── 🟨 derive-version.cjs
│   ├── 🟨 generate-release-notes.cjs
│   ├── 📄 generate_android_icons.py
│   ├── 🟨 release-check.cjs
│   ├── 🐚 test-cloudflare-worker.sh
│   └── 🟨 version-check.cjs
├── 💻 src/
│   ├── 🧩 components/
│   │   ├── 🟨 AccountPills.jsx
│   │   ├── 🟨 BalanceCard.jsx
│   │   ├── 🟨 BottomNav.jsx
│   │   ├── 🟨 CategoryDonutChart.jsx
│   │   ├── 🟨 CategoryExpenseWatch.jsx
│   │   ├── 🟨 ConvertedMainAmount.jsx
│   │   ├── 🟨 CurrencyRateRow.jsx
│   │   ├── 🟨 CurrencyRatesPanel.jsx
│   │   ├── 🟨 ErrorBoundary.jsx
│   │   ├── 🟨 Header.jsx
│   │   ├── 🟨 HiddenAccountBadge.jsx
│   │   ├── 🟨 LoanCurrencyStack.jsx
│   │   ├── 🟨 LoanPaymentCurrencyStack.jsx
│   │   ├── 🟨 LockScreen.jsx
│   │   ├── 🟨 ModalPortal.jsx
│   │   ├── 🟨 NotificationPanel.jsx
│   │   ├── 🟨 QuickActions.jsx
│   │   ├── 🟨 Toast.jsx
│   │   ├── 🟨 TransactionList.jsx
│   │   └── 🟨 WelcomeSetup.jsx
│   ├── ⚙️ config/
│   │   └── 🟨 appConfig.js
│   ├── ✨ features/
│   │   └── 📁 receipt-scanner/
│   │       └── 🟨 ReceiptReviewModal.jsx
│   ├── 🪝 hooks/
│   │   ├── 🟨 useCurrencyRates.js
│   │   ├── 🟨 useKeyboardSheet.js
│   │   ├── 🟨 useLedger.js
│   │   └── 🟨 useSmoothApp.js
│   ├── 🪟 modals/
│   │   ├── 🟨 AccountDetailModal.jsx
│   │   ├── 🟨 AddAccountModal.jsx
│   │   ├── 🟨 AddBudgetModal.jsx
│   │   ├── 🟨 AddCategoryModal.jsx
│   │   ├── 🟨 AddLoanModal.jsx
│   │   ├── 🟨 AddTransactionModal.jsx
│   │   ├── 🟨 CategorySettingModal.jsx
│   │   ├── 🟨 ConfirmModal.jsx
│   │   ├── 🟨 CurrencyConverterModal.jsx
│   │   ├── 🟨 DateCalendarModal.jsx
│   │   ├── 🟨 EditCurrencyModal.jsx
│   │   ├── 🟨 ExportDataModal.jsx
│   │   ├── 🟨 LoanDetailModal.jsx
│   │   ├── 🟨 OptionPickerModal.jsx
│   │   ├── 🟨 PinSetupModal.jsx
│   │   ├── 🟨 RecordDateFilterModal.jsx
│   │   ├── 🟨 ScanOptionsModal.jsx
│   │   ├── 🟨 TimePickerModal.jsx
│   │   ├── 🟨 TransactionDetailModal.jsx
│   │   ├── 🟨 UpdateInstallModal.jsx
│   │   └── 🟨 WebCameraModal.jsx
│   ├── 📦 models/
│   │   ├── 🟨 accountOptions.js
│   │   ├── 🟨 categories.js
│   │   ├── 🟨 currencies.js
│   │   └── 🟨 defaultState.js
│   ├── 📄 pages/
│   │   ├── 🟨 Analytics.jsx
│   │   ├── 🟨 Home.jsx
│   │   ├── 🟨 Records.jsx
│   │   └── 🟨 Settings.jsx
│   ├── 🔌 services/
│   │   ├── 🟨 cloudBackup.js
│   │   ├── 🟨 googleAuth.js
│   │   ├── 🟨 receiptOcrNative.js
│   │   └── 🟨 receiptParser.js
│   ├── 🧰 utils/
│   │   ├── 🟨 accountMainCurrencyLine.js
│   │   ├── 🟨 accountViewTotals.js
│   │   ├── 🟨 analyticsCurrencyTotals.js
│   │   ├── 🟨 backNavigation.js
│   │   ├── 🟨 categoryExpenseWatch.js
│   │   ├── 🟨 currency.js
│   │   ├── 🟨 currencyConverter.js
│   │   ├── 🟨 currentBalanceRates.js
│   │   ├── 🟨 dateRangeFilter.js
│   │   ├── 🟨 exportData.js
│   │   ├── 🟨 format.js
│   │   ├── 🟨 googleBackupMeta.js
│   │   ├── 🟨 ledgerMigration.js
│   │   ├── 🟨 loanBudgetCurrency.js
│   │   ├── 🟨 loanPayments.js
│   │   ├── 🟨 loanReminder.js
│   │   ├── 🟨 loanTransactionLinks.js
│   │   ├── 🟨 localBackup.js
│   │   ├── 🟨 lock.js
│   │   ├── 🟨 nativeFileActions.js
│   │   ├── 🟨 notifications.js
│   │   ├── 🟨 numberFormat.js
│   │   ├── 🟨 rateOverrides.js
│   │   ├── 🟨 receiptOcr.js
│   │   ├── 🟨 recordRateSnapshot.js
│   │   ├── 🟨 recordTransactions.js
│   │   ├── 🟨 scanCamera.js
│   │   ├── 🟨 sound.js
│   │   ├── 🟨 storage.js
│   │   ├── 🟨 themeAccent.js
│   │   ├── 🟨 transactionCurrencyView.js
│   │   ├── 🟨 transactionFilters.js
│   │   ├── 🟨 transferCurrency.js
│   │   └── 🟨 updater.js
│   ├── 🟨 App.jsx
│   ├── 🟨 main.jsx
│   └── 🎨 styles.css
├── 🔐 .env.cloudflare.worker.example
├── 🔐 .env.example
├── 📄 .gitignore
├── 📄 .npmrc
├── 🧾 capacitor.config.json
├── 📄 index.html
├── 🧾 package-lock.json
├── 🧾 package.json
├── 🐚 push.sh
├── 📘 README.md
└── 🟨 vite.config.js
```

## 🧭 Important folders

| Folder | Purpose |
| --- | --- |
| `.github/workflows/` | GitHub Actions APK build and release workflow. |
| `cloudflare-worker/` | Firebase-authenticated Worker source and upload examples. |
| `docs/` | All modern A-Z documentation with book navigation. |
| `public/` | Banner, app icons, manifest, screenshots. |
| `scripts/` | Checks, release notes, Termux deploy, Worker tests. |
| `src/components/` | Reusable UI pieces. |
| `src/hooks/` | Ledger state and business logic. |
| `src/modals/` | Bottom sheet and modal UI. |
| `src/pages/` | Main app pages. |
| `src/services/` | Firebase auth and Cloudflare KV backup service. |
| `src/utils/` | Pure helpers, local backup, exports, formatting. |

## 🔥 Critical cloud files

| File | Why it matters |
| --- | --- |
| `src/services/googleAuth.js` | Native Google login + Firebase Auth REST exchange. |
| `src/services/cloudBackup.js` | Encrypted backup upload/restore through Worker. |
| `cloudflare-worker/src/index.js` | Verifies Firebase token and stores user backup in KV. |
| `scripts/deploy-cloudflare-worker-termux.sh` | Deploys Worker/KV from Android Termux. |
| `.env.example` | Safe app env template. |
| `.env.cloudflare.worker.example` | Safe Worker deploy output template. |

---

## 📖 Book navigation

| ⬅️ Previous | 🏠 Index | Next ➡️ |
| --- | --- | --- |
| [🧯 Troubleshooting](TROUBLESHOOTING.md) | [📚 Documentation Home](README.md) | [📜 Changelog](CHANGELOG.md) |

⬆️ Back to top • 🪺 CashNest X docs rotate like a book.
