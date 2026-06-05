import { Capacitor, registerPlugin } from '@capacitor/core';
import { requestNativeNotificationPermission } from './notifications';

export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
export const GITHUB_REPO = typeof __GITHUB_REPO__ !== 'undefined' ? __GITHUB_REPO__ : '';
export const GITHUB_TOKEN = typeof __GITHUB_TOKEN__ !== 'undefined' ? __GITHUB_TOKEN__ : '';

function buildGitHubHeaders(extra = {}) {
  const headers = { Accept: 'application/vnd.github+json', ...extra };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  return headers;
}

function getAssetDownloadUrl(asset) {
  if (!asset) return '';
  // Private GitHub releases must be downloaded through the GitHub asset API.
  // browser_download_url works in Chrome after login, but Android DownloadManager
  // can fail because the auth header is lost on the release-asset redirect.
  // asset.url + Accept: application/octet-stream returns the real APK bytes.
  return asset.url || asset.browser_download_url || '';
}

function getAssetDownloadHeaders(asset) {
  if (!GITHUB_TOKEN) return {};
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/octet-stream',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

const ApkInstaller = registerPlugin('ApkInstaller');

function cleanVersion(value = '') {
  return String(value).trim().replace(/^v/i, '').split('-')[0];
}

export function compareVersions(a = '0.0.0', b = '0.0.0') {
  const pa = cleanVersion(a).split('.').map((n) => Number(n) || 0);
  const pb = cleanVersion(b).split('.').map((n) => Number(n) || 0);
  const len = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < len; i += 1) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

export function formatBytes(bytes = 0) {
  const value = Number(bytes || 0);
  if (!value) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function getDownloadCount(asset) {
  return Number(asset?.download_count || 0).toLocaleString();
}

export async function checkLatestRelease(repo = GITHUB_REPO) {
  if (!repo) throw new Error('GitHub repo is not configured');
  const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: buildGitHubHeaders()
  });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(GITHUB_TOKEN
        ? 'No GitHub release found yet'
        : 'Private repo needs VITE_GITHUB_TOKEN secret or make releases public');
    }
    if (response.status === 401 || response.status === 403) throw new Error('GitHub token cannot read this private repo');
    throw new Error(`GitHub update check failed (${response.status})`);
  }
  const release = await response.json();
  const latestVersion = cleanVersion(release.tag_name || release.name || '0.0.0');
  const asset = (release.assets || []).find((item) => /\.apk$/i.test(item.name));
  return {
    release,
    asset: asset ? {
      ...asset,
      downloadUrl: getAssetDownloadUrl(asset),
      apiUrl: asset.url || '',
      browserUrl: asset.browser_download_url || '',
      downloadHeaders: getAssetDownloadHeaders(asset),
      version: latestVersion
    } : null,
    latestVersion,
    currentVersion: APP_VERSION,
    hasUpdate: compareVersions(release.tag_name || release.name || '0.0.0', APP_VERSION) > 0,
    releaseUrl: release.html_url
  };
}

export async function showNativeUpdateAvailableNotification(update = {}) {
  const asset = update?.asset;
  if (!Capacitor.isNativePlatform() || !asset?.downloadUrl) return false;
  try {
    await requestNativeNotificationPermission();
    await ApkInstaller.showUpdateNotification({
      url: asset.downloadUrl,
      apiUrl: asset.apiUrl || asset.url || asset.downloadUrl,
      browserUrl: asset.browserUrl || asset.browser_download_url || '',
      fileName: asset.name || 'CashNest-X-update.apk',
      version: cleanVersion(update?.latestVersion || update?.release?.tag_name || ''),
      size: Number(asset.size || 0),
      title: 'CashNest X update available',
      body: `Version ${update?.latestVersion || update?.release?.tag_name || ''} is ready to download.`,
      headers: asset.downloadHeaders || {}
    });
    return true;
  } catch (error) {
    console.warn('Native update notification failed:', error);
    return false;
  }
}



export async function getNativeDownloadState() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    return await ApkInstaller.getDownloadState();
  } catch (error) {
    return null;
  }
}

export async function addNativeDownloadProgressListener(onProgress = () => {}) {
  if (!Capacitor.isNativePlatform()) return { remove: async () => {} };
  try {
    return await ApkInstaller.addListener('downloadProgress', (info) => {
      onProgress(normalizeDownloadProgress(info));
    });
  } catch (error) {
    return { remove: async () => {} };
  }
}

export function normalizeDownloadProgress(info = {}, fallbackTotal = 0) {
  const received = Number(info?.received || info?.downloaded || info?.bytesDownloaded || 0);
  const fallback = Number(fallbackTotal || 0);
  const reportedTotal = Number(info?.total || info?.size || info?.contentLength || 0);
  // Trust GitHub's release asset size over a smaller native total. A tiny native
  // total usually means Android received a GitHub HTML/JSON redirect/metadata
  // response, not the actual APK.
  const total = Math.max(fallback, reportedTotal, received);
  const rawPercent = Number(info?.percent || info?.progress || 0);
  const calculatedPercent = total > 0 ? Math.round((received / total) * 100) : rawPercent;
  const percent = (fallback > reportedTotal && reportedTotal > 0)
    ? calculatedPercent
    : Math.max(rawPercent, calculatedPercent);
  return {
    received,
    total,
    percent: Math.max(0, Math.min(100, Number(percent || 0))),
    status: info?.status || 'downloading',
    filePath: info?.filePath || info?.path || '',
    fileName: info?.fileName || info?.name || '',
    version: cleanVersion(info?.version || ''),
    url: info?.url || '',
    expectedSize: Number(info?.expectedSize || 0)
  };
}


export async function openNativeDownloadedInstaller() {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await ApkInstaller.openDownloadedInstaller();
    return true;
  } catch (error) {
    return false;
  }
}


export async function cleanupNativeInstalledDownload(currentVersion = APP_VERSION) {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await ApkInstaller.cleanupInstalledDownload({ currentVersion: cleanVersion(currentVersion) });
    return true;
  } catch (error) {
    return false;
  }
}

export async function installApkWithNativeProgress(asset, onProgress = () => {}) {
  if (!asset?.downloadUrl) throw new Error('APK download URL missing');

  if (!Capacitor.isNativePlatform()) {
    window.open(asset.browser_download_url || asset.downloadUrl, '_blank', 'noopener,noreferrer');
    return { opened: true, browser: true };
  }

  await requestNativeNotificationPermission();

  let listener;
  try {
    listener = await ApkInstaller.addListener('downloadProgress', (info) => {
      onProgress(normalizeDownloadProgress(info, Number(asset.size || 0)));
    });
  } catch (error) {
    // Older native plugin build may not support listeners yet; install still works.
  }

  try {
    return await ApkInstaller.installFromUrl({
      url: asset.downloadUrl,
      apiUrl: asset.apiUrl || asset.url || asset.downloadUrl,
      browserUrl: asset.browserUrl || asset.browser_download_url || '',
      fileName: asset.name || 'CashNest-X-update.apk',
      version: cleanVersion(asset.version || ''),
      showNotification: true,
      size: Number(asset.size || 0),
      browserUrl: asset.browserUrl || asset.browser_download_url || '',
      apiUrl: asset.apiUrl || asset.url || '',
      headers: asset.downloadHeaders || {}
    });
  } finally {
    try { await listener?.remove?.(); } catch (error) {}
  }
}
