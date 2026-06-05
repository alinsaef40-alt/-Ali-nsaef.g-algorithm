// Live URL (Netlify) + local file path when opened from Desktop
const PUBLIC_SIMULATOR_URL = 'https://jade-praline-a64a0c.netlify.app';
const LIVE_URL_STORAGE_KEY = 'ga-simulator-live-url';

function isLocalHost(hostname) {
  if (!hostname) return true;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
}

function isFileProtocol() {
  return location.protocol === 'file:';
}

function getLocalFileUrl() {
  if (!isFileProtocol()) return '';
  try {
    return decodeURIComponent(location.href.split('#')[0].split('?')[0]);
  } catch {
    return location.href.split('#')[0].split('?')[0];
  }
}

function normalizeLiveUrl(raw) {
  if (!raw) return '';
  if (String(raw).startsWith('file:')) {
    try {
      return decodeURIComponent(String(raw).split('#')[0].split('?')[0]);
    } catch {
      return String(raw).split('#')[0].split('?')[0];
    }
  }
  try {
    const u = new URL(raw, location.href);
    u.search = '';
    u.hash = '';
    let path = u.pathname.replace(/index\.html$/i, '');
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    u.pathname = path || '/';
    const href = u.href;
    return href.endsWith('/') && path !== '/' ? href.slice(0, -1) : href;
  } catch {
    return String(raw).trim();
  }
}

function detectLiveUrlFromBrowser() {
  if (location.hostname.endsWith('github.io')) {
    return normalizeLiveUrl(location.origin + location.pathname);
  }
  const localFile = getLocalFileUrl();
  if (localFile) return localFile;
  if (location.protocol.startsWith('http') && !isLocalHost(location.hostname)) {
    return normalizeLiveUrl(location.origin + location.pathname);
  }
  const manual = (PUBLIC_SIMULATOR_URL || '').trim();
  if (manual) return normalizeLiveUrl(manual);
  try {
    const saved = localStorage.getItem(LIVE_URL_STORAGE_KEY);
    if (saved) return normalizeLiveUrl(saved);
  } catch (_) {}
  return '';
}

async function fetchDeployedUrl() {
  if (isFileProtocol()) return '';
  try {
    const res = await fetch('./site-url.json', { cache: 'no-store' });
    if (!res.ok) return '';
    const data = await res.json();
    return normalizeLiveUrl(data.url || '');
  } catch {
    return '';
  }
}

function persistLiveUrl(url) {
  if (!url || isFileProtocol() || url.startsWith('file:')) return;
  try {
    localStorage.setItem(LIVE_URL_STORAGE_KEY, url);
  } catch (_) {}
}

function applyShareLink(url) {
  const box = document.getElementById('shareLinkBox');
  const input = document.getElementById('shareLinkInput');
  const hint = document.getElementById('shareLinkHint');
  if (!box || !input || !url) return;
  box.classList.remove('hidden');
  input.value = url;
  input.title = url;
  if (hint) {
    hint.textContent = url.startsWith('file:')
      ? (typeof t === 'function' ? t('shareLinkLocalHint') : 'رابط التشغيل المحلي')
      : (typeof t === 'function' ? t('shareLinkDesc') : '');
  }
}

async function initShareLink() {
  const input = document.getElementById('shareLinkInput');
  const copyBtn = document.getElementById('btnCopyLink');
  if (!input) return;

  let url = getLocalFileUrl();
  if (!url) {
    const fromFile = await fetchDeployedUrl();
    const fromBrowser = detectLiveUrlFromBrowser();
    url = fromFile || fromBrowser;
  }

  if (url) {
    if (!url.startsWith('file:')) persistLiveUrl(url);
    applyShareLink(url);
  }

  copyBtn?.addEventListener('click', async () => {
    const link = input.value.trim();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      const old = copyBtn.textContent;
      copyBtn.textContent = typeof t === 'function' ? t('linkCopied') : 'Copied';
      setTimeout(() => { copyBtn.textContent = old; }, 2000);
    } catch {
      input.select();
      document.execCommand('copy');
    }
  });
}

document.addEventListener('DOMContentLoaded', initShareLink);
