export const defaultState = {
  theme: 'dark',
  accentColor: 'blue',
  currency: 'LKR',
  signedIn: false,
  googleUser: null,
  googleAccessToken: '',
  googleIdToken: '',
  googleRefreshToken: '',
  firebaseUid: '',
  googleBackup: {
    status: 'disabled',
    lastBackupAt: '',
    lastRestoreAt: '',
    fileId: '',
    modifiedTime: '',
    error: ''
  },
  localBackup: {
    status: 'idle',
    lastAutoBackupAt: '',
    lastManualBackupAt: '',
    lastRestoreAt: '',
    fileName: '',
    path: '',
    error: ''
  },
  cloudBackups: {
    cloudflare: {
      status: 'idle',
      lastBackupAt: '',
      lastRestoreAt: '',
      fileName: '',
      error: ''
    }
  },
  onboardingComplete: false,
  userName: '',
  accounts: [
    { id: 'cash-wallet-default', name: 'Cash Wallet', type: 'Cash Wallet', openingBalance: 0, balance: 0, color: 'amber', icon: 'ti-wallet', currency: 'LKR', hideFromTotal: false, isDefault: true }
  ],
  transactions: [],
  loans: [],
  budgets: [],
  customCategories: [],
  notifications: [],
  archivedNotifications: [],
  preferences: {
    notifications: true,
    transactionSounds: true,
    biometricLock: false,
    pinLock: false,
    pinHash: '',
    pinSalt: '',
    compactNumbers: false,
    autoGoogleBackup: false,
    autoLocalBackup: false,
    selectedCloudBackupProvider: 'cloudflare',
    autoCloudBackupEnabled: false,
    autoCloudBackupProvider: '',
    disabledCategories: []
  }
};

export const accountTypes = ['Cash Wallet', 'Bank Account', 'Savings Account', 'Mobile Wallet', 'Foreign Cash', 'Card Account'];
export const loanTypes = ['Lending', 'Borrowing'];
