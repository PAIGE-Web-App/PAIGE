/**
 * Browser Compatibility Utilities
 * 
 * Provides browser detection and feature checking for cross-browser compatibility.
 * Used to ensure the app works correctly across Chrome, Safari, Firefox, and Edge.
 */

export interface BrowserInfo {
  name: 'chrome' | 'safari' | 'firefox' | 'edge' | 'unknown';
  isSafari: boolean;
  isFirefox: boolean;
  isChrome: boolean;
  isEdge: boolean;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  version: string | null;
}

/**
 * Detects the current browser and returns detailed information
 */
export function getBrowserInfo(): BrowserInfo {
  if (typeof window === 'undefined') {
    // Server-side rendering
    return {
      name: 'unknown',
      isSafari: false,
      isFirefox: false,
      isChrome: false,
      isEdge: false,
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      version: null,
    };
  }

  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/.test(ua);

  // Edge (Chromium-based)
  const isEdge = /Edg\//.test(ua);
  if (isEdge) {
    const version = ua.match(/Edg\/(\d+)/)?.[1] || null;
    return {
      name: 'edge',
      isSafari: false,
      isFirefox: false,
      isChrome: false,
      isEdge: true,
      isMobile,
      isIOS,
      isAndroid,
      version,
    };
  }

  // Chrome
  const isChrome = /Chrome/.test(ua) && !/Edg\//.test(ua);
  if (isChrome) {
    const version = ua.match(/Chrome\/(\d+)/)?.[1] || null;
    return {
      name: 'chrome',
      isSafari: false,
      isFirefox: false,
      isChrome: true,
      isEdge: false,
      isMobile,
      isIOS,
      isAndroid,
      version,
    };
  }

  // Safari (must check after Chrome because Safari UA contains "Safari")
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  if (isSafari) {
    const version = ua.match(/Version\/(\d+)/)?.[1] || null;
    return {
      name: 'safari',
      isSafari: true,
      isFirefox: false,
      isChrome: false,
      isEdge: false,
      isMobile,
      isIOS,
      isAndroid,
      version,
    };
  }

  // Firefox
  const isFirefox = /Firefox/.test(ua);
  if (isFirefox) {
    const version = ua.match(/Firefox\/(\d+)/)?.[1] || null;
    return {
      name: 'firefox',
      isSafari: false,
      isFirefox: true,
      isChrome: false,
      isEdge: false,
      isMobile,
      isIOS,
      isAndroid,
      version,
    };
  }

  // Unknown browser
  return {
    name: 'unknown',
    isSafari: false,
    isFirefox: false,
    isChrome: false,
    isEdge: false,
    isMobile,
    isIOS,
    isAndroid,
    version: null,
  };
}

/**
 * Checks if localStorage is available and working
 * Returns false in Safari private browsing or Firefox strict privacy mode
 */
export function isStorageAvailable(type: 'localStorage' | 'sessionStorage' = 'localStorage'): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch (e) {
    // Safari private browsing throws QuotaExceededError
    // Firefox strict privacy blocks storage
    return false;
  }
}

/**
 * Checks if IndexedDB is available and working
 * Returns false in Safari/Firefox private modes
 */
export function isIndexedDBAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return 'indexedDB' in window && window.indexedDB !== null;
  } catch (e) {
    return false;
  }
}

/**
 * Checks if Service Workers are supported
 */
export function isServiceWorkerSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return 'serviceWorker' in navigator;
}

/**
 * Detects if the user is in private/incognito mode
 * Note: This is a best-effort detection and may not work in all browsers
 */
export async function isPrivateBrowsing(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  const browser = getBrowserInfo();

  // Check storage availability (most reliable method)
  if (!isStorageAvailable('localStorage')) {
    return true;
  }

  // Safari-specific check
  if (browser.isSafari) {
    try {
      // Safari throws in private mode
      // @ts-ignore - openDatabase is a legacy Safari-specific API
      window.openDatabase('test', '1.0', 'test', 1);
      return false;
    } catch (e) {
      return true;
    }
  }

  // Firefox-specific check
  if (browser.isFirefox) {
    // Firefox blocks IndexedDB in private mode
    return !isIndexedDBAvailable();
  }

  return false;
}

/**
 * Returns a human-readable browser name
 */
export function getBrowserName(): string {
  const info = getBrowserInfo();
  
  switch (info.name) {
    case 'chrome':
      return 'Chrome';
    case 'safari':
      return info.isIOS ? 'Safari (iOS)' : 'Safari';
    case 'firefox':
      return 'Firefox';
    case 'edge':
      return 'Edge';
    default:
      return 'Unknown Browser';
  }
}

/**
 * Checks if the browser is fully supported (all features work)
 */
export function isFullySupported(): boolean {
  return (
    isStorageAvailable('localStorage') &&
    isStorageAvailable('sessionStorage') &&
    isIndexedDBAvailable()
  );
}

/**
 * Returns a list of unsupported features
 */
export function getUnsupportedFeatures(): string[] {
  const unsupported: string[] = [];

  if (!isStorageAvailable('localStorage')) {
    unsupported.push('localStorage');
  }

  if (!isStorageAvailable('sessionStorage')) {
    unsupported.push('sessionStorage');
  }

  if (!isIndexedDBAvailable()) {
    unsupported.push('IndexedDB');
  }

  if (!isServiceWorkerSupported()) {
    unsupported.push('Service Workers');
  }

  return unsupported;
}

