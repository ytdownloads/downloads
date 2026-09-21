import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_PREFERENCE = 'ytdl_auto_download_enabled';
const STORAGE_PREFIX_TRIGGERED = 'ytdl_autodl_triggered_';
const CUSTOM_EVENT_NAME = 'ytdl_autodownload_changed';

/**
 * Get global Auto Download preference from localStorage.
 * Default is FALSE (OFF).
 */
export function getAutoDownloadPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_PREFERENCE) === 'true';
  } catch {
    return false;
  }
}

/**
 * Update global Auto Download preference in localStorage and notify all mounted components.
 */
export function setAutoDownloadPreference(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFERENCE, enabled ? 'true' : 'false');
    window.dispatchEvent(new Event(CUSTOM_EVENT_NAME));
  } catch {
    // ignore
  }
}

/**
 * React hook to read and toggle global Auto Download preference across all components.
 */
export function useAutoDownload(): [boolean, (next?: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(() => getAutoDownloadPreference());

  useEffect(() => {
    const handleSync = () => {
      setEnabled(getAutoDownloadPreference());
    };
    window.addEventListener(CUSTOM_EVENT_NAME, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(CUSTOM_EVENT_NAME, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const toggle = useCallback((next?: boolean) => {
    const nextVal = typeof next === 'boolean' ? next : !getAutoDownloadPreference();
    setAutoDownloadPreference(nextVal);
    setEnabled(nextVal);
  }, []);

  return [enabled, toggle];
}

/**
 * Check if a file was already triggered in this session.
 */
export function isItemAlreadyDownloaded(key: string): boolean {
  try {
    return sessionStorage.getItem(`${STORAGE_PREFIX_TRIGGERED}${key}`) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark a file as triggered in this session.
 */
export function markItemAlreadyDownloaded(key: string): void {
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX_TRIGGERED}${key}`, 'true');
  } catch {
    // ignore
  }
}

/**
 * Trigger standard browser file download via temporary anchor element.
 */
export function triggerBrowserFileDownload(fileUrl: string, fileName?: string): void {
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = fileName || 'download';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
