import { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { useLedger } from './hooks/useLedger';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';
import NotificationPanel from './components/NotificationPanel';
import WelcomeSetup from './components/WelcomeSetup';
import LockScreen from './components/LockScreen';
import Home from './pages/Home';
import Analytics from './pages/Analytics';
import Records from './pages/Records';
import Settings from './pages/Settings';
import AddTransactionModal from './modals/AddTransactionModal';
import AddAccountModal from './modals/AddAccountModal';
import AddLoanModal from './modals/AddLoanModal';
import AddBudgetModal from './modals/AddBudgetModal';
import TransactionDetailModal from './modals/TransactionDetailModal';
import AccountDetailModal from './modals/AccountDetailModal';
import AddCategoryModal from './modals/AddCategoryModal';
import LoanDetailModal from './modals/LoanDetailModal';
import UpdateInstallModal from './modals/UpdateInstallModal';
import ScanOptionsModal from './modals/ScanOptionsModal';
import WebCameraModal from './modals/WebCameraModal';
import ReceiptReviewModal from './features/receipt-scanner/ReceiptReviewModal';
import CurrencyConverterModal from './modals/CurrencyConverterModal';
import { APP_VERSION, GITHUB_REPO, checkLatestRelease, cleanupNativeInstalledDownload } from './utils/updater';
import { scanReceiptImage, parseReceiptText } from './utils/receiptOcr';
import { captureReceiptPhoto, canUseWebCamera } from './utils/scanCamera';
import { clearDeliveredMobileNotification, registerMobileNotificationActions } from './utils/notifications';
import { openExportTarget } from './utils/nativeFileActions';
import { useCurrencyRates } from './hooks/useCurrencyRates';
import { useSmoothApp } from './hooks/useSmoothApp';
import { findLoanForTransaction, isLoanPaymentTransaction } from './utils/loanTransactionLinks';
import { closeTopNativeBackLayer } from './utils/backNavigation';

export default function App() {
  useSmoothApp();
  const ledger = useLedger();
  const rateInfo = useCurrencyRates(true);
  const [activeTab, setActiveTab] = useState('home');
  const [filter, setFilter] = useState('All');
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [transactionType, setTransactionType] = useState('expense');
  const [transactionPreset, setTransactionPreset] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [loanOpen, setLoanOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loanPaymentEditTx, setLoanPaymentEditTx] = useState(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [updaterOpen, setUpdaterOpen] = useState(false);
  const [scanOptionsOpen, setScanOptionsOpen] = useState(false);
  const [webCameraOpen, setWebCameraOpen] = useState(false);
  const [converterOpen, setConverterOpen] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanProgress, setScanProgress] = useState({ status: 'Opening camera…', progress: 0 });
  const [receiptReview, setReceiptReview] = useState(null);
  const scanInputRef = useRef(null);
  const [locked, setLocked] = useState(false);
  const [lockNonce, setLockNonce] = useState(0);
  const [unlockedOnce, setUnlockedOnce] = useState(false);
  const updatePromptShown = useRef(false);
  const lastUnlockAt = useRef(0);
  const lockSuspendedUntil = useRef(0);

  function pauseLock(milliseconds = 7000) {
    lockSuspendedUntil.current = Math.max(lockSuspendedUntil.current, Date.now() + milliseconds);
  }

  function isLockPaused() {
    return Date.now() < lockSuspendedUntil.current;
  }
  const lockEnabled = !!(ledger.state.preferences?.biometricLock || ledger.state.preferences?.pinHash);
  const activeLoan = useMemo(() => selectedLoan ? (ledger.state.loans || []).find((loan) => loan.id === selectedLoan.id) || selectedLoan : null, [selectedLoan, ledger.state.loans]);

  function requestLock() {
    if (!lockEnabled || isLockPaused()) return;
    setLocked(true);
    setLockNonce((value) => value + 1);
  }


  useEffect(() => {
    cleanupNativeInstalledDownload(APP_VERSION);
  }, []);

  useEffect(() => {
    setLocked(lockEnabled);
    setUnlockedOnce(!lockEnabled);
    if (lockEnabled) setLockNonce((value) => value + 1);
  }, []);



  useEffect(() => {
    if (!lockEnabled) {
      setLocked(false);
      setUnlockedOnce(true);
    }
  }, [lockEnabled]);

  useEffect(() => {
    if (!GITHUB_REPO || locked || !unlockedOnce || updatePromptShown.current) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const next = await checkLatestRelease(GITHUB_REPO);
        if (!cancelled && next.hasUpdate) {
          updatePromptShown.current = true;
          ledger.notifyReleaseAvailable?.(next);
          setUpdaterOpen(true);
        }
      } catch (error) {
        // Silent auto-check: do not show popup unless a real update is available.
      }
    }, 1400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [locked, unlockedOnce]);



  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let mounted = true;
    let urlHandle = null;
    const shouldOpenUpdater = (url = '') => /cashnest_x:\/\/(updates?|updater)/i.test(String(url || ''));
    const openUpdaterFromNotification = () => {
      setActiveTab('settings');
      setUpdaterOpen(true);
    };

    CapacitorApp.getLaunchUrl()
      .then((launch) => {
        if (mounted && shouldOpenUpdater(launch?.url)) openUpdaterFromNotification();
      })
      .catch(() => {});

    CapacitorApp.addListener('appUrlOpen', (event) => {
      if (!mounted || !shouldOpenUpdater(event?.url)) return;
      openUpdaterFromNotification();
    }).then((handle) => { urlHandle = handle; }).catch(() => {});

    return () => {
      mounted = false;
      try { urlHandle?.remove?.(); } catch (error) {}
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let mounted = true;
    let actionHandle = null;
    registerMobileNotificationActions({
      onMarkRead: async (extra, notification) => {
        if (!mounted) return;
        ledger.markAllRead();
        await clearDeliveredMobileNotification(notification?.id || extra?.mobileId);
      },
      onDelete: async (extra, notification) => {
        if (!mounted) return;
        const appId = extra?.appNotificationId;
        if (appId) ledger.deleteNotification(appId, false);
        else ledger.deleteReadNotifications?.();
        await clearDeliveredMobileNotification(notification?.id || extra?.mobileId);
      },
      onOpen: async (extra) => {
        if (!mounted) return;
        if (extra?.screen === 'export-file') {
          const opened = await openExportTarget(extra);
          if (!opened) setActiveTab('settings');
          return;
        }
        if (extra?.screen === 'updates') {
          setActiveTab('settings');
          setUpdaterOpen(true);
        } else if (extra?.screen === 'records') setActiveTab('records');
        else if (extra?.screen === 'settings') setActiveTab('settings');
        else setActiveTab('home');
      }
    }).then((handle) => { actionHandle = handle; });
    return () => {
      mounted = false;
      if (actionHandle?.remove) actionHandle.remove();
    };
  }, []);


  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    const backListener = CapacitorApp.addListener('backButton', () => {
      if (closeTopNativeBackLayer()) return;
      if (locked) return;
      if (updaterOpen) { setUpdaterOpen(false); return; }
      if (notifOpen) { setNotifOpen(false); return; }
      if (transactionOpen) { closeTransactionModal(); return; }
      if (accountOpen) { setAccountOpen(false); return; }
      if (loanOpen) { setLoanOpen(false); setEditingLoan(null); return; }
      if (budgetOpen) { setBudgetOpen(false); return; }
      if (categoryOpen) { setCategoryOpen(false); return; }
      if (scanOptionsOpen) { setScanOptionsOpen(false); return; }
      if (webCameraOpen) { setWebCameraOpen(false); return; }
      if (converterOpen) { setConverterOpen(false); return; }
      if (receiptReview) { setReceiptReview(null); return; }
      if (selectedTransaction) { setSelectedTransaction(null); return; }
      if (selectedAccount) { setSelectedAccount(null); return; }
      if (selectedLoan) { setSelectedLoan(null); return; }
      if (activeTab !== 'home') { setActiveTab('home'); return; }
      CapacitorApp.exitApp();
    });
    const stateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!lockEnabled || isLockPaused()) return;
      if (!isActive) {
        requestLock();
        return;
      }
      if (Date.now() - lastUnlockAt.current > 1200) requestLock();
    });
    const resumeListener = CapacitorApp.addListener('resume', async () => {
      // Do not auto-open the updater from stale native download state.
      // The updater opens only from the Settings update button, update
      // notification action, or a fresh release detected by the auto-check.
      if (lockEnabled && !isLockPaused() && Date.now() - lastUnlockAt.current > 1200) requestLock();
    });
    return () => {
      backListener.then((handle) => handle.remove());
      stateListener.then((handle) => handle.remove());
      resumeListener.then((handle) => handle.remove());
    };
  }, [lockEnabled, locked, updaterOpen, notifOpen, transactionOpen, accountOpen, loanOpen, budgetOpen, categoryOpen, scanOptionsOpen, webCameraOpen, converterOpen, receiptReview, selectedTransaction, selectedAccount, selectedLoan, activeTab]);

  useEffect(() => {
    const shouldIgnoreRelock = () => Date.now() - lastUnlockAt.current < 1800;
    const onVisibility = () => {
      if (Capacitor.isNativePlatform()) return;
      if (document.visibilityState === 'hidden' && lockEnabled && !isLockPaused() && !shouldIgnoreRelock()) requestLock();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [lockEnabled]);

  async function openReceiptCamera() {
    pauseLock(120000);
    try {
      const nativePhoto = await captureReceiptPhoto();
      if (nativePhoto?.dataUrl) {
        await openScannedReceipt(nativePhoto);
        return;
      }
    } catch (error) {
      const message = String(error?.message || '').toLowerCase();
      if (message.includes('cancel')) return;
    }
    if (canUseWebCamera()) {
      setWebCameraOpen(true);
      return;
    }
    ledger.notify('Camera not available. Use Pick Photo.', 'ti-camera-off');
  }

  function openReceiptPhotoPicker() {
    pauseLock(120000);
    const input = scanInputRef.current;
    if (input) {
      input.value = '';
      input.click();
    } else {
      ledger.notify('Photo picker is not ready. Try again.', 'ti-photo-off');
    }
  }

  async function openAdd(type = 'expense', preset = null) {
    if (type === 'scan') {
      await openReceiptCamera();
      return;
    }
    setTransactionType(type);
    setTransactionPreset(preset);
    setTransactionOpen(true);
  }

  function buildReceiptPreset(file, imageDataUrl, details) {
    const today = new Date(file?.lastModified || Date.now()).toISOString().slice(0, 10);
    const amount = details?.amount || '';
    const merchant = details?.merchant || 'Scanned Receipt';
    const category = details?.category || 'Bills';
    const dateValue = details?.dateValue || today;
    const textNote = details?.text ? details.text.slice(0, 220).replace(/\s+/g, ' ') : '';
    return {
      amount,
      category,
      note: textNote ? `Scanned receipt • ${merchant} • ${textNote}` : `Scanned receipt • ${merchant}`,
      title: merchant,
      receiptImage: String(imageDataUrl || ''),
      receiptName: file?.name || file?.fileName || 'receipt.jpg',
      dateValue,
      ocrText: details?.text || '',
      merchant
    };
  }

  function openReviewedReceiptTransaction(review) {
    if (!review) return;
    const file = { name: review.receiptName || 'receipt.jpg', fileName: review.receiptName || 'receipt.jpg', lastModified: Date.now() };
    setReceiptReview(null);
    setTransactionType('expense');
    setTransactionPreset(buildReceiptPreset(file, review.receiptImage, review));
    setTransactionOpen(true);
  }

  async function openScannedReceipt(file) {
    if (!file) return;
    setScanBusy(true);
    setScanProgress({ status: 'Reading receipt photo…', progress: 5 });
    const runScan = async (imageDataUrl) => {
      try {
        setScanProgress({ status: 'Scanning text inside photo…', progress: 12 });
        const fileName = file.name || file.fileName || 'receipt.jpg';
        const details = await scanReceiptImage(imageDataUrl, fileName, (info) => {
          const progress = Math.max(12, Math.min(98, info.progress || 0));
          setScanProgress({ status: info.status || 'Scanning receipt…', progress });
        });
        const review = { ...details, receiptImage: imageDataUrl, receiptName: fileName };
        setReceiptReview(review);
        ledger.notify(details.amount ? `Receipt detected: Rs. ${details.amount}` : 'Receipt scanned. Review missing amount.', 'ti-camera-check');
      } catch (error) {
        const fileName = file.name || file.fileName || 'receipt.jpg';
        const details = parseReceiptText('', fileName);
        setReceiptReview({ ...details, receiptImage: imageDataUrl, receiptName: fileName, scanError: error?.message || 'OCR failed' });
        ledger.notify('Photo attached. ML Kit scan failed; review manually.', 'ti-alert-triangle');
      } finally {
        setScanBusy(false);
        setScanProgress({ status: 'Opening transaction…', progress: 100 });
      }
    };

    if (file.dataUrl) {
      await runScan(String(file.dataUrl));
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => runScan(String(reader.result || ''));
    reader.onerror = () => {
      setScanBusy(false);
      ledger.notify('Could not read receipt image', 'ti-alert-triangle');
    };
    reader.readAsDataURL(file);
  }

  function openTransactionDetail(tx) {
    const linkedLoan = findLoanForTransaction(tx, ledger.state.loans || [], ledger.accounts || [], ledger.state.currency || 'LKR');
    if (linkedLoan) {
      setSelectedLoan(linkedLoan);
      return;
    }
    setSelectedTransaction(tx);
  }

  function editTransaction(tx) {
    if (isLoanPaymentTransaction(tx)) {
      const linkedLoan = findLoanForTransaction(tx, ledger.state.loans || [], ledger.accounts || [], ledger.state.currency || 'LKR');
      if (linkedLoan) {
        setSelectedTransaction(null);
        setLoanPaymentEditTx(tx);
        setSelectedLoan(linkedLoan);
        return;
      }
    }
    setSelectedTransaction(null);
    setTransactionPreset(null);
    setEditingTransaction(tx);
    setTransactionType(tx.type || 'expense');
    setTransactionOpen(true);
  }

  function closeTransactionModal() {
    setTransactionOpen(false);
    setEditingTransaction(null);
    setTransactionPreset(null);
  }

  function closeLoanModal() {
    setLoanOpen(false);
    setEditingLoan(null);
  }

  function editLoan(loan) {
    if (!loan) return;
    setSelectedLoan(null);
    setLoanPaymentEditTx(null);
    setEditingLoan(loan);
    setLoanOpen(true);
  }

  function openRecords(mode = 'transactions') {
    window.dispatchEvent(new CustomEvent('cashnest_x:records-mode', { detail: mode }));
    setActiveTab('records');
  }

  function unlockApp() {
    lastUnlockAt.current = Date.now();
    setLocked(false);
    setUnlockedOnce(true);
  }

  const pageProps = { ledger, filter, setFilter, openAdd, openRecords, openAccount: () => setAccountOpen(true), openAccountDetails: setSelectedAccount, openCategory: () => setCategoryOpen(true), openLoan: () => setLoanOpen(true), openBudget: () => setBudgetOpen(true), openNotifications: () => setNotifOpen(true), openTransaction: openTransactionDetail, openUpdater: () => setUpdaterOpen(true), openMore: () => setScanOptionsOpen(true), conversionRates: rateInfo.rates };

  if (!ledger.state.onboardingComplete) {
    return (
      <div className="phone" id="phone">
        <WelcomeSetup defaultCurrency={ledger.state.currency} onComplete={ledger.completeOnboarding} />
        <Toast toast={ledger.toast} />
      </div>
    );
  }

  return (
    <div className="phone" id="phone">
      <input
        ref={scanInputRef}
        className="hidden-scan-input"
        type="file"
        accept="image/*"
        onChange={(event) => {
          pauseLock(120000);
          openScannedReceipt(event.target.files?.[0]);
          event.currentTarget.value = '';
        }}
      />
      {activeTab === 'home' && <Home {...pageProps} />}
      {activeTab === 'analytics' && <Analytics ledger={ledger} conversionRates={rateInfo.rates} />}
      {activeTab === 'records' && <Records ledger={ledger} openAdd={openAdd} openLoan={() => setLoanOpen(true)} openBudget={() => setBudgetOpen(true)} openCategory={() => setCategoryOpen(true)} openTransaction={openTransactionDetail} openLoanDetails={setSelectedLoan} conversionRates={rateInfo.rates} />}
      {activeTab === 'settings' && <Settings ledger={ledger} openCategory={() => setCategoryOpen(true)} openAccountDetails={setSelectedAccount} openUpdater={() => setUpdaterOpen(true)} conversionRates={rateInfo.rates} rateInfo={rateInfo} />}

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} openAdd={() => openAdd('expense')} openQuickAdd={openAdd} />
      <AddTransactionModal open={transactionOpen} close={closeTransactionModal} accounts={ledger.accounts} categories={ledger.visibleCategories} currency={ledger.state.currency} defaultType={transactionType} preset={transactionPreset} editTransaction={editingTransaction} onSave={ledger.addTransaction} onUpdate={ledger.updateTransaction} onLoanSave={ledger.addLoan} onCreateCategory={() => setCategoryOpen(true)} conversionRates={rateInfo.rates} />
      <AddAccountModal open={accountOpen} close={() => setAccountOpen(false)} onSave={ledger.addAccount} defaultCurrency={ledger.state.currency} />
      <AddLoanModal open={loanOpen} close={closeLoanModal} onSave={ledger.addLoan} onUpdate={ledger.updateLoan} editLoan={editingLoan} defaultCurrency={ledger.state.currency} accounts={ledger.accounts} />
      <AddBudgetModal open={budgetOpen} close={() => setBudgetOpen(false)} categories={ledger.visibleCategories} onSave={ledger.addBudget} onCreateCategory={() => setCategoryOpen(true)} defaultCurrency={ledger.state.currency} />
      <NotificationPanel open={notifOpen} close={() => setNotifOpen(false)} notifications={ledger.state.notifications} archivedNotifications={ledger.state.archivedNotifications} markAllRead={ledger.markAllRead} deleteReadNotifications={ledger.deleteReadNotifications} markRead={ledger.markNotificationRead} archiveNotification={ledger.archiveNotification} unarchiveNotification={ledger.unarchiveNotification} deleteNotification={ledger.deleteNotification} />
      <TransactionDetailModal transaction={selectedTransaction} accounts={ledger.accounts} appCurrency={ledger.state.currency} conversionRates={rateInfo.rates} close={() => setSelectedTransaction(null)} onDelete={ledger.deleteTransaction} onEdit={editTransaction} />
      <AccountDetailModal account={selectedAccount} close={() => setSelectedAccount(null)} onSave={ledger.updateAccount} onDelete={ledger.deleteAccount} />
      <LoanDetailModal loan={activeLoan} close={() => { setSelectedLoan(null); setLoanPaymentEditTx(null); }} onDelete={ledger.deleteLoan} onEdit={editLoan} onPay={ledger.addLoanPayment} onUpdatePayment={ledger.updateLoanPayment} onDeletePayment={ledger.deleteLoanPayment} onMarkPaid={ledger.markLoanPaid} editPaymentTransaction={loanPaymentEditTx} clearEditPayment={() => setLoanPaymentEditTx(null)} appCurrency={ledger.state.currency} conversionRates={rateInfo.rates} accounts={ledger.accounts} />
      <AddCategoryModal open={categoryOpen} close={() => setCategoryOpen(false)} onSave={ledger.addCategory} />
      <UpdateInstallModal open={updaterOpen} close={() => setUpdaterOpen(false)} repo={GITHUB_REPO} notify={ledger.notify} onReleaseAvailable={ledger.notifyReleaseAvailable} pauseLock={pauseLock} />
      <ScanOptionsModal open={scanOptionsOpen} close={() => setScanOptionsOpen(false)} onPhoto={openReceiptPhotoPicker} onConvert={() => setConverterOpen(true)} />
      <CurrencyConverterModal open={converterOpen} close={() => setConverterOpen(false)} defaultCurrency={ledger.state.currency} />
      <WebCameraModal open={webCameraOpen} close={() => { pauseLock(5000); setWebCameraOpen(false); }} onCapture={(file) => { pauseLock(120000); openScannedReceipt(file); }} />
      <ReceiptReviewModal open={!!receiptReview} scan={receiptReview} categories={ledger.visibleCategories} close={() => setReceiptReview(null)} onUse={openReviewedReceiptTransaction} />
      {scanBusy && (
        <div className="scan-processing">
          <div className="scan-processing-card">
            <div className="scan-ring"><i className="ti ti-camera-search" /></div>
            <h2>Scanning receipt photo…</h2>
            <p>{scanProgress.status || 'Reading text inside the photo.'}</p>
            <div className="scan-progress"><span style={{ width: `${scanProgress.progress || 0}%` }} /></div>
            <small>{scanProgress.progress || 0}%</small>
            <button className="secondary-btn scan-cancel-btn" type="button" onClick={() => { pauseLock(5000); setScanBusy(false); setScanProgress({ status: 'Scan cancelled', progress: 0 }); }}>
              Cancel scan
            </button>
          </div>
        </div>
      )}
      <LockScreen locked={locked} lockNonce={lockNonce} prefs={ledger.state.preferences} verifyPin={ledger.verifyPin} biometricUnlock={ledger.biometricUnlock} onUnlocked={unlockApp} />
      <Toast toast={ledger.toast} />
    </div>
  );
}
