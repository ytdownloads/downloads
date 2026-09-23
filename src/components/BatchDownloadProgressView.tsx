import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  FolderArchive,
  RotateCcw,
  ArrowDownToLine,
  ListOrdered,
  Sparkles,
  ArrowLeft,
  Clock,
  HardDrive,
  Download,
  Plus,
  CheckSquare,
  Square,
  X,
  Film,
  Music,
  ListPlus,
  Check,
} from 'lucide-react';
import { BatchJobData, PlaylistMetadata } from '../types/index';
import {
  cancelBatchDownload,
  cancelBatchItem,
  retryBatchDownload,
  addBatchItems,
  getBatchZipUrl,
  getBatchItemFileUrl,
} from '../services/api';
import {
  useAutoDownload,
  triggerBrowserFileDownload,
} from '../services/autoDownload';
import { sanitizeErrorMessage } from '../utils/errorSanitizer';

const STORAGE_PREFIX_TRIGGERED = 'ytdl_autodl_triggered_';

function getStoredTriggeredItems(batchJobId: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX_TRIGGERED}${batchJobId}`);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {
    // ignore
  }
  return new Set();
}

function storeTriggeredItems(batchJobId: string, set: Set<string>): void {
  try {
    sessionStorage.setItem(
      `${STORAGE_PREFIX_TRIGGERED}${batchJobId}`,
      JSON.stringify(Array.from(set))
    );
  } catch {
    // ignore
  }
}

interface BatchDownloadProgressViewProps {
  batch: BatchJobData;
  playlistMetadata?: PlaylistMetadata | null;
  onReset: () => void;
  onBatchUpdated?: (updated: BatchJobData) => void;
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatSpeed(bytesPerSec: number | null | undefined): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '';
  return `${formatBytes(bytesPerSec)}/s`;
}

function formatEta(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds < 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `ETA ${mins}m ${secs}s`;
  return `ETA ${secs}s`;
}

export const BatchDownloadProgressView: React.FC<BatchDownloadProgressViewProps> = ({
  batch,
  playlistMetadata,
  onReset,
  onBatchUpdated,
}) => {
  const [cancelling, setCancelling] = useState(false);
  const [cancellingItemId, setCancellingItemId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  // Add More Videos Modal state
  const [isAddMoreModalOpen, setIsAddMoreModalOpen] = useState(false);
  const [modalSelectedIds, setModalSelectedIds] = useState<Set<string>>(new Set());
  const [modalFormatType, setModalFormatType] = useState<'video' | 'audio'>('video');
  const [modalQuality, setModalQuality] = useState<string>('best');
  const [modalLimitError, setModalLimitError] = useState<string | null>(null);
  const [modalApiError, setModalApiError] = useState<string | null>(null);
  const [isAddingItems, setIsAddingItems] = useState(false);

  // Global Auto Download feature state
  const [autoDownload, toggleAutoDownload] = useAutoDownload();
  // Seconds left for countdown per item: e.g. { [itemId]: 3 | 2 | 1 }
  const [countdownState, setCountdownState] = useState<Record<string, number>>({});
  // Set of item IDs that have already been triggered (via auto download or manual download)
  const [triggeredItemIds, setTriggeredItemIds] = useState<Set<string>>(() =>
    getStoredTriggeredItems(batch.batchJobId)
  );

  // Synchronized ref for triggered items to prevent race conditions & duplicate downloads
  const triggeredItemsRef = useRef<Set<string>>(triggeredItemIds);
  triggeredItemsRef.current = triggeredItemIds;

  // Active countdown timers map: itemId -> { interval, timeout }
  const timersRef = useRef<Map<string, { interval: ReturnType<typeof setInterval>; timeout: ReturnType<typeof setTimeout> }>>(
    new Map()
  );

  const {
    batchJobId,
    playlistTitle,
    formatId,
    status,
    totalItems,
    completedItems,
    failedItems,
    cancelledItems,
    overallPercentage,
    items,
    zipStatus = 'idle',
    zipStatusMessage,
    zipFileName,
    zipFileSize,
  } = batch;

  const isCompleted = status === 'completed';
  const isCompletedWithErrors = status === 'completed_with_errors';
  const isCancelled = status === 'cancelled';
  const isFailed = status === 'failed';
  const isActive = status === 'queued' || status === 'processing';

  const existingBatchIds = new Set(items.map((i) => i.id));
  const unQueuedPlaylistItems = playlistMetadata
    ? playlistMetadata.items.filter((i) => !existingBatchIds.has(i.id))
    : [];
  const unQueuedCount = unQueuedPlaylistItems.length;

  const getModalFormatId = (): string => {
    if (modalFormatType === 'audio') return 'audio-best';
    if (modalQuality === '1080p') return 'video-1080p';
    if (modalQuality === '720p') return 'video-720p';
    if (modalQuality === '480p') return 'video-480p';
    return 'video-1080p';
  };

  const toggleModalItem = (id: string) => {
    if (existingBatchIds.has(id)) return;
    setModalSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (next.size <= 30) {
        setModalLimitError(null);
      } else {
        setModalLimitError(
          'Maximum 30 videos can be added at a time. Please select 30 or fewer videos.'
        );
      }
      return next;
    });
  };

  const handleSelectNext30 = () => {
    const next30 = unQueuedPlaylistItems.slice(0, 30);
    setModalSelectedIds(new Set(next30.map((i) => i.id)));
    setModalLimitError(null);
  };

  const handleClearModalSelection = () => {
    setModalSelectedIds(new Set());
    setModalLimitError(null);
  };

  const handleAddSelectedToQueue = async () => {
    if (modalSelectedIds.size === 0 || isAddingItems || !playlistMetadata) return;

    if (modalSelectedIds.size > 30) {
      setModalLimitError(
        'Maximum 30 videos can be added at a time. Please select 30 or fewer videos.'
      );
      return;
    }

    setModalLimitError(null);
    setModalApiError(null);
    setIsAddingItems(true);

    const selectedItems = playlistMetadata.items
      .filter((i) => modalSelectedIds.has(i.id))
      .map((i) => ({
        id: i.id,
        url: i.webpageUrl,
        title: i.title,
        durationSeconds: i.duration,
        thumbnail: i.thumbnail,
      }));

    const chosenFormatId = getModalFormatId();

    try {
      const updatedBatch = await addBatchItems(batchJobId, {
        formatId: chosenFormatId,
        items: selectedItems,
      });
      if (onBatchUpdated) {
        onBatchUpdated(updatedBatch);
      }
      setIsAddMoreModalOpen(false);
      setModalSelectedIds(new Set());
    } catch (err) {
      setModalApiError(
        err instanceof Error ? sanitizeErrorMessage(err.message) : 'Failed to add items to download queue.'
      );
    } finally {
      setIsAddingItems(false);
    }
  };

  // Find currently active item (concurrency = 1)
  const activeItem = items.find(
    (i) => i.status === 'downloading' || i.status === 'processing'
  );

  // Derive human-readable current operation banner
  let currentOperation = 'Preparing download queue...';
  if (zipStatus === 'creating') {
    currentOperation = zipStatusMessage || 'Creating ZIP archive...';
  } else if (zipStatus === 'finalizing') {
    currentOperation = zipStatusMessage || 'Finalizing ZIP archive...';
  } else if (zipStatus === 'ready') {
    currentOperation = '✓ ZIP archive ready for download';
  } else if (zipStatus === 'failed') {
    currentOperation = 'ZIP creation failed (individual files available below)';
  } else if (activeItem) {
    if (activeItem.stageMessage) {
      currentOperation = activeItem.stageMessage;
    } else if (activeItem.stage === 'merging' || activeItem.status === 'processing') {
      currentOperation = `Merging video & audio with FFmpeg: ${activeItem.title}`;
    } else if (activeItem.stage === 'downloading_video') {
      currentOperation = `Downloading video stream: ${activeItem.title}`;
    } else if (activeItem.stage === 'downloading_audio') {
      currentOperation = `Downloading audio stream: ${activeItem.title}`;
    } else if (activeItem.stage === 'finalizing') {
      currentOperation = `Finalizing video file: ${activeItem.title}`;
    } else {
      currentOperation = `Downloading: ${activeItem.title}`;
    }
  } else if (isCompleted) {
    currentOperation = 'All playlist downloads completed!';
  } else if (isCompletedWithErrors) {
    currentOperation = `Completed with ${failedItems} error(s)`;
  } else if (isCancelled) {
    currentOperation = 'Batch download cancelled';
  } else if (isFailed) {
    currentOperation = 'Batch download failed';
  }

  const triggerBrowserDownload = useCallback(
    (itemId: string, fileName?: string) => {
      // 1. Immediately record as triggered to prevent duplicates
      const updated = new Set(triggeredItemsRef.current);
      updated.add(itemId);
      triggeredItemsRef.current = updated;
      setTriggeredItemIds(updated);
      storeTriggeredItems(batchJobId, updated);

      // 2. Clear any active countdown timer for this item
      const activeTimer = timersRef.current.get(itemId);
      if (activeTimer) {
        clearInterval(activeTimer.interval);
        clearTimeout(activeTimer.timeout);
        timersRef.current.delete(itemId);
      }
      setCountdownState((prev) => {
        if (!prev[itemId]) return prev;
        const next = { ...prev };
        delete next[itemId];
        return next;
      });

      // 3. Initiate real browser download using standard download anchor
      const fileUrl = getBatchItemFileUrl(batchJobId, itemId);
      triggerBrowserFileDownload(fileUrl, fileName || `video_${itemId}.mp4`);
    },
    [batchJobId]
  );

  const handleDownloadItem = (itemId: string, fileName?: string) => {
    // Manual click immediately triggers download and cancels any pending auto-download timer
    triggerBrowserDownload(itemId, fileName);
  };

  const handleToggleAutoDownload = () => {
    toggleAutoDownload();
  };

  // Strictly sequential auto-download countdown effect
  useEffect(() => {
    if (!autoDownload) {
      if (timersRef.current.size > 0) {
        timersRef.current.forEach((t) => {
          clearInterval(t.interval);
          clearTimeout(t.timeout);
        });
        timersRef.current.clear();
        setCountdownState({});
      }
      return;
    }

    // If an item is already counting down, strictly wait for it to complete
    if (timersRef.current.size > 0) {
      return;
    }

    // Find the next completed item that has not been triggered yet
    const nextItem = items.find(
      (item) => item.status === 'completed' && !triggeredItemsRef.current.has(item.id)
    );

    if (!nextItem) return;

    const itemId = nextItem.id;
    const fileName = nextItem.fileName;

    // Start 3-second countdown
    let secondsLeft = 3;
    setCountdownState((prev) => ({ ...prev, [itemId]: 3 }));

    const interval = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft > 0) {
        setCountdownState((prev) => ({ ...prev, [itemId]: secondsLeft }));
      }
    }, 1000);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      timersRef.current.delete(itemId);
      setCountdownState((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });

      // Automatically trigger real browser download
      triggerBrowserDownload(itemId, fileName);
    }, 3000);

    timersRef.current.set(itemId, { interval, timeout });
  }, [autoDownload, items, triggerBrowserDownload, triggeredItemIds]);

  // Clean up all active timers on component unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => {
        clearInterval(t.interval);
        clearTimeout(t.timeout);
      });
      timersRef.current.clear();
    };
  }, []);

  const handleCancelCountdown = (itemId: string) => {
    const activeTimer = timersRef.current.get(itemId);
    if (activeTimer) {
      clearInterval(activeTimer.interval);
      clearTimeout(activeTimer.timeout);
      timersRef.current.delete(itemId);
    }
    setCountdownState((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    // Mark as triggered so auto-download won't re-trigger for this item
    const updated = new Set(triggeredItemsRef.current);
    updated.add(itemId);
    triggeredItemsRef.current = updated;
    setTriggeredItemIds(updated);
    storeTriggeredItems(batchJobId, updated);
  };

  const handleCancelItem = async (itemId: string) => {
    handleCancelCountdown(itemId);
    try {
      setCancellingItemId(itemId);
      await cancelBatchItem(batchJobId, itemId);
    } catch (err) {
      console.error('Failed to cancel batch item', err);
    } finally {
      setCancellingItemId(null);
    }
  };

  const handleCancelAll = async () => {
    try {
      setCancelling(true);
      await cancelBatchDownload(batchJobId);
    } catch (err) {
      console.error('Failed to cancel batch', err);
    } finally {
      setCancelling(false);
    }
  };

  const handleRetryFailed = async () => {
    try {
      setRetrying(true);
      await retryBatchDownload(batchJobId);
    } catch (err) {
      console.error('Failed to retry batch', err);
    } finally {
      setRetrying(false);
    }
  };

  const handleDownloadZip = () => {
    setDownloadingZip(true);
    const zipUrl = getBatchZipUrl(batchJobId);
    const link = document.createElement('a');
    link.href = zipUrl;
    link.download = zipFileName || `${playlistTitle || 'Playlist'}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloadingZip(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-slide-up">
      {/* Header Summary Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#161a31] to-[#0e1122] border border-indigo-500/25 p-4 sm:p-6 md:p-8 shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 space-y-6">
          {/* Navigation & Header Badges */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm">
                <ListOrdered className="w-3.5 h-3.5" />
                DOWNLOAD QUEUE
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                Format: <span className="text-white font-semibold">{formatId}</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-950/40 text-purple-300 border border-purple-800/40">
                Strict Sequential (1 by 1)
              </span>
            </div>

            <button
              type="button"
              onClick={onReset}
              aria-label="Back to home page"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition active:scale-95 duration-150 cursor-pointer min-h-[36px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>
          </div>

          {/* Playlist Title & Action Buttons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight truncate">
                {playlistTitle || 'YouTube Playlist Queue'}
              </h2>
              <p className="text-xs text-slate-400">
                Job ID: <span className="font-mono text-slate-300">{batchJobId}</span>
              </p>
            </div>

            {/* Top Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Ready ZIP Download Button */}
              {zipStatus === 'ready' && (
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={downloadingZip}
                  aria-label="Download final ZIP archive"
                  className="min-h-[38px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 active:scale-95 duration-150 transition cursor-pointer disabled:opacity-50"
                >
                  {downloadingZip ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FolderArchive className="w-4 h-4" />
                  )}
                  <span>Download ZIP {zipFileSize ? `(${formatBytes(zipFileSize)})` : ''}</span>
                </button>
              )}

              {/* ZIP In-Progress Indicator */}
              {(zipStatus === 'creating' || zipStatus === 'finalizing') && (
                <button
                  type="button"
                  disabled
                  aria-label="Creating ZIP archive"
                  className="min-h-[38px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 font-medium text-sm cursor-wait"
                >
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Creating ZIP...</span>
                </button>
              )}

              {/* Auto Download Toggle */}
              <button
                type="button"
                onClick={handleToggleAutoDownload}
                aria-label={`Toggle auto download. Currently ${autoDownload ? 'ON' : 'OFF'}`}
                className={`min-h-[38px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition active:scale-95 duration-150 cursor-pointer ${
                  autoDownload
                    ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    autoDownload ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <span>Auto Download: {autoDownload ? 'ON' : 'OFF'}</span>
              </button>

              {/* + Add More Videos Button */}
              {playlistMetadata && (
                <button
                  type="button"
                  onClick={() => {
                    setModalSelectedIds(new Set());
                    setModalLimitError(null);
                    setModalApiError(null);
                    setIsAddMoreModalOpen(true);
                  }}
                  aria-label="Add more videos from this playlist to queue"
                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-semibold shadow-sm shadow-indigo-500/10 transition active:scale-95 duration-150 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add More Videos</span>
                  {unQueuedCount > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-indigo-500/40 text-indigo-200 rounded-full font-bold">
                      {unQueuedCount} left
                    </span>
                  )}
                </button>
              )}

              {/* Cancel All Button */}
              {isActive && (
                <button
                  type="button"
                  onClick={handleCancelAll}
                  disabled={cancelling}
                  aria-label="Cancel all remaining downloads"
                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition active:scale-95 duration-150 cursor-pointer disabled:opacity-50"
                >
                  {cancelling ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>Cancel All</span>
                </button>
              )}

              {/* Retry Failed Button */}
              {failedItems > 0 && !isActive && (
                <button
                  type="button"
                  onClick={handleRetryFailed}
                  disabled={retrying}
                  aria-label="Retry failed downloads"
                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition active:scale-95 duration-150 cursor-pointer disabled:opacity-50"
                >
                  {retrying ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  <span>Retry Failed ({failedItems})</span>
                </button>
              )}
            </div>
          </div>

          {/* Multiple Downloads Browser Permission Notice */}
          {autoDownload && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <span>Your browser may ask permission to allow multiple downloads.</span>
            </div>
          )}

          {/* Current Operation Live Banner */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/80 border border-indigo-500/30">
            <div className="flex-shrink-0">
              {isActive || zipStatus === 'creating' || zipStatus === 'finalizing' ? (
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              ) : isCompleted || zipStatus === 'ready' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : isFailed ? (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              ) : (
                <Sparkles className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wide">
                Current Operation
              </span>
              <p className="text-sm font-medium text-white truncate">
                {currentOperation}
              </p>
            </div>
          </div>

          {/* Overall Progress Bar & Numbers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300 font-medium">
                Overall Progress: <strong className="text-white">{completedItems} / {totalItems} completed</strong>
              </span>
              <span className="font-mono text-indigo-300 font-bold text-base">
                {overallPercentage}%
              </span>
            </div>

            <div className="w-full h-3 bg-slate-900/90 rounded-full overflow-hidden border border-slate-700/50 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isCompleted || zipStatus === 'ready'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/30'
                    : isCompletedWithErrors
                    ? 'bg-gradient-to-r from-amber-500 to-orange-400 shadow-lg shadow-amber-500/30'
                    : isCancelled
                    ? 'bg-slate-600'
                    : isFailed
                    ? 'bg-rose-600'
                    : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/30'
                }`}
                style={{ width: `${Math.max(overallPercentage, 2)}%` }}
              />
            </div>

            {/* Counter Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                <span className="text-slate-400">Total Selected</span>
                <span className="font-bold text-white">{totalItems}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs">
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                </span>
                <span className="font-bold text-emerald-300">{completedItems}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-blue-950/30 border border-blue-500/20 text-xs">
                <span className="text-blue-400 flex items-center gap-1">
                  <Loader2 className={`w-3.5 h-3.5 ${activeItem ? 'animate-spin' : ''}`} /> Active
                </span>
                <span className="font-bold text-blue-300">{activeItem ? 1 : 0}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-rose-950/30 border border-rose-500/20 text-xs">
                <span className="text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Failed
                </span>
                <span className="font-bold text-rose-300">
                  {failedItems}
                  {cancelledItems > 0 ? ` (${cancelledItems} stop)` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ZIP Status Dedicated Card */}
      {zipStatus === 'ready' ? (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900/70 border border-emerald-500/40 p-5 md:p-6 shadow-xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex-shrink-0 mt-0.5">
                <FolderArchive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>✓ ZIP Ready for Download</span>
                  {zipFileSize && (
                    <span className="text-xs font-normal text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                      {formatBytes(zipFileSize)}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-300 font-mono mt-1 truncate max-w-md">
                  {zipFileName || `${playlistTitle || 'Playlist'}.zip`}
                </p>
                {failedItems > 0 ? (
                  <p className="text-xs text-amber-300 mt-1">
                    Note: ZIP archive contains all {completedItems} completed videos ({failedItems} video{failedItems > 1 ? 's' : ''} failed).
                  </p>
                ) : (
                  <p className="text-xs text-emerald-300/80 mt-1">
                    All {completedItems} videos successfully packaged into a single archive.
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              aria-label="Download completed ZIP"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-98 transition flex-shrink-0 disabled:opacity-50"
            >
              {downloadingZip ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Download ZIP</span>
            </button>
          </div>
        </div>
      ) : zipStatus === 'creating' || zipStatus === 'finalizing' ? (
        <div className="rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900/70 border border-indigo-500/40 p-5 md:p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex-shrink-0">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{zipStatus === 'finalizing' ? 'Finalizing ZIP Archive...' : 'Creating ZIP Archive...'}</span>
              </h3>
              <p className="text-xs text-indigo-200/90 mt-1">
                {zipStatusMessage || 'Bundling completed video files into an archive on the server...'}
              </p>
            </div>
          </div>
        </div>
      ) : zipStatus === 'failed' ? (
        <div className="rounded-2xl bg-rose-950/30 border border-rose-500/30 p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-rose-200">ZIP Archive Creation Failed</h4>
              <p className="text-xs text-rose-300/80 mt-0.5">
                {sanitizeErrorMessage(zipStatusMessage) || 'Could not assemble ZIP archive. You can still save individual completed videos directly from the queue below.'}
              </p>
            </div>
          </div>
        </div>
      ) : isActive ? (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
            <FolderArchive className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <p className="text-xs text-slate-400">
              <strong className="text-slate-300">Automated ZIP generation:</strong> A single ZIP archive will be automatically created on the server as soon as all queued downloads finish.
            </p>
          </div>
        </div>
      ) : null}

      {/* Continue Playlist Banner (when completed or completed with errors) */}
      {(isCompleted || isCompletedWithErrors) && playlistMetadata && unQueuedCount > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900/60 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Continue Playlist Download</span>
            </h3>
            <p className="text-xs text-slate-400">
              There are <strong className="text-slate-200">{unQueuedCount}</strong> more videos available from this playlist. Add another batch of up to 30 videos to continue downloading.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setModalSelectedIds(new Set());
              setModalLimitError(null);
              setModalApiError(null);
              setIsAddMoreModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-md shadow-indigo-500/25 transition active:scale-98 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add More Videos ({unQueuedCount} left)</span>
          </button>
        </div>
      )}

      {/* Playlist Items Sequential Queue Card */}
      <div className="rounded-2xl bg-[#101322]/90 border border-indigo-500/20 shadow-2xl backdrop-blur-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <span>Playlist Items Queue</span>
            <span className="text-xs font-normal text-slate-400">({items.length} videos)</span>
          </h3>
          <span className="text-xs font-medium text-indigo-400 bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-800/50">
            Concurrency: strictly 1 at a time
          </span>
        </div>

        {/* Scrollable list of items */}
        <div className="divide-y divide-slate-800/60 max-h-[580px] overflow-y-auto">
          {items.map((item, index) => {
            const isItemActive = item.status === 'downloading' || item.status === 'processing';
            const isItemComplete = item.status === 'completed';
            const isItemFailed = item.status === 'failed';
            const isItemPending = item.status === 'pending';
            const isItemCancelled = item.status === 'cancelled';
            const isItemIndeterminate = Boolean(
              item.isIndeterminate ||
              item.stage === 'merging' ||
              item.stage === 'processing' ||
              item.stage === 'finalizing'
            );

            const sequentialNumber = String(index + 1).padStart(2, '0');

            return (
              <div
                key={`${item.id}-${index}`}
                className={`p-4 transition-colors ${
                  isItemActive
                    ? 'bg-indigo-950/25 border-l-4 border-indigo-500'
                    : isItemComplete
                    ? 'bg-emerald-950/10'
                    : isItemFailed
                    ? 'bg-rose-950/10'
                    : 'hover:bg-slate-800/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    {/* Sequential Number 01, 02, 03... */}
                    <div className="w-8 text-center flex-shrink-0 pt-0.5 sm:pt-0">
                      {isItemComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                      ) : isItemFailed ? (
                        <AlertCircle className="w-5 h-5 text-rose-400 mx-auto" />
                      ) : isItemActive ? (
                        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin mx-auto" />
                      ) : isItemCancelled ? (
                        <XCircle className="w-5 h-5 text-slate-500 mx-auto" />
                      ) : (
                        <span className="text-xs font-mono font-bold text-slate-500">
                          {sequentialNumber}
                        </span>
                      )}
                    </div>

                    {/* Thumbnail */}
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="w-16 h-11 object-cover rounded-lg border border-slate-700/50 flex-shrink-0 bg-slate-900"
                      />
                    ) : (
                      <div className="w-16 h-11 rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center text-xs text-slate-500 font-mono font-semibold flex-shrink-0">
                        {sequentialNumber}
                      </div>
                    )}

                    {/* Title, Status, and Real Metrics */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-white truncate max-w-md">
                          {item.title}
                        </p>
                      </div>

                      {/* Active Download Progress Details */}
                      {isItemActive && (
                        <div className="space-y-1.5 mt-2">
                          {/* Status / Sub-stage text */}
                          <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                            <span className="text-indigo-300 font-medium">
                              {item.stageMessage || (
                                item.stage === 'merging'
                                  ? '● Merging video and audio streams (FFmpeg)...'
                                  : item.stage === 'downloading_video'
                                  ? '● Downloading video stream...'
                                  : item.stage === 'downloading_audio'
                                  ? '● Downloading audio stream...'
                                  : item.stage === 'finalizing'
                                  ? '● Finalizing video file...'
                                  : `● Downloading (${item.percentage ?? 0}%)`
                              )}
                            </span>

                            <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                              {item.downloadedBytes ? (
                                <span className="text-slate-300">
                                  {item.totalBytes
                                    ? `${formatBytes(item.downloadedBytes)} / ${formatBytes(item.totalBytes)}`
                                    : formatBytes(item.downloadedBytes)}
                                </span>
                              ) : null}

                              {item.speedBytesPerSecond ? (
                                <span className="text-indigo-300">{formatSpeed(item.speedBytesPerSecond)}</span>
                              ) : null}

                              {item.etaSeconds !== null && item.etaSeconds !== undefined ? (
                                <span className="text-slate-400">{formatEta(item.etaSeconds)}</span>
                              ) : null}

                              {!isItemIndeterminate && item.percentage !== null ? (
                                <span className="text-white font-bold">{item.percentage}%</span>
                              ) : null}
                            </div>
                          </div>

                          {/* Real Progress Bar */}
                          <div className="w-full h-2 bg-slate-800/90 rounded-full overflow-hidden">
                            {isItemIndeterminate ? (
                              <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500 w-full animate-pulse" />
                            ) : (
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-200"
                                style={{ width: `${Math.max(item.percentage, 2)}%` }}
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Completed File Metrics */}
                      {isItemComplete && (
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                          {item.fileSize && (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <HardDrive className="w-3 h-3" />
                              {formatBytes(item.fileSize)}
                            </span>
                          )}
                          {item.durationSeconds && (
                            <span className="text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {Math.floor(item.durationSeconds / 60)}:
                              {String(item.durationSeconds % 60).padStart(2, '0')}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Waiting in Queue message */}
                      {isItemPending && (
                        <p className="text-xs text-slate-500 mt-1">
                          Waiting in queue (will download in order #{sequentialNumber})
                        </p>
                      )}

                      {/* Failed Error Message */}
                      {isItemFailed && (
                        <p className="text-xs text-rose-400 mt-1 truncate">
                          {sanitizeErrorMessage(item.error?.message, item.error?.code) || 'Download failed'}
                        </p>
                      )}

                      {/* Cancelled message */}
                      {isItemCancelled && (
                        <p className="text-xs text-slate-500 mt-1">Cancelled</p>
                      )}
                    </div>
                  </div>

                  {/* Status Badges & Action Buttons */}
                  <div className="flex flex-wrap items-center justify-end sm:justify-start gap-2 flex-shrink-0 pt-1 sm:pt-0 pl-11 sm:pl-0">
                    {isItemComplete && (
                      <>
                        {autoDownload && countdownState[item.id] !== undefined ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                              <Clock className="w-3.5 h-3.5" />
                              <span>
                                Auto download in{' '}
                                <span key={countdownState[item.id]} className="inline-block animate-countdown-pop font-bold text-white">
                                  {countdownState[item.id]}s
                                </span>
                                ...
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCancelCountdown(item.id)}
                              className="min-h-[30px] inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-medium transition active:scale-95 duration-150 cursor-pointer"
                              title="Cancel auto download"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        ) : triggeredItemIds.has(item.id) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Downloaded</span>
                          </span>
                        ) : (
                          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>✓ Completed</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDownloadItem(item.id, item.fileName)}
                          aria-label={`Download video ${item.title}`}
                          className="min-h-[30px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition active:scale-95 duration-150 cursor-pointer"
                          title="Download this file individually"
                        >
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      </>
                    )}

                    {isItemActive && (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1.5 shadow-sm">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {item.stage === 'merging' ? (
                            '● Merging (FFmpeg)'
                          ) : item.stage === 'downloading_audio' ? (
                            '● Audio Stream'
                          ) : (
                            `● Downloading (${item.percentage ?? 0}%)`
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCancelItem(item.id)}
                          disabled={cancellingItemId === item.id}
                          aria-label={`Cancel download for ${item.title}`}
                          className="min-h-[30px] inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-medium transition active:scale-95 duration-150 disabled:opacity-50 cursor-pointer"
                          title="Cancel this item only"
                        >
                          {cancellingItemId === item.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          <span>Cancel</span>
                        </button>
                      </div>
                    )}

                    {isItemPending && (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          ○ Waiting
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCancelItem(item.id)}
                          disabled={cancellingItemId === item.id}
                          aria-label={`Cancel download for ${item.title}`}
                          className="min-h-[30px] inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300/80 hover:text-rose-300 border border-rose-500/20 text-xs font-medium transition active:scale-95 duration-150 disabled:opacity-50 cursor-pointer"
                          title="Cancel this item only"
                        >
                          {cancellingItemId === item.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          <span>Cancel</span>
                        </button>
                      </div>
                    )}

                    {isItemFailed && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        ✕ Failed
                      </span>
                    )}

                    {isItemCancelled && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-500 border border-slate-700">
                        ⊘ Cancelled
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add More Videos Modal */}
      {isAddMoreModalOpen && playlistMetadata && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-more-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-fade-in"
        >
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0f172a] border border-indigo-500/30 rounded-3xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800 bg-[#161a31]/80">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    <ListPlus className="w-3.5 h-3.5" />
                    ADD TO QUEUE
                  </span>
                  <span className="text-xs text-slate-400">
                    {items.length} in queue • {unQueuedCount} remaining
                  </span>
                </div>
                <h3 id="add-more-title" className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                  {playlistMetadata.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsAddMoreModalOpen(false)}
                aria-label="Close modal"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-95 duration-150 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Controls Bar */}
            <div className="p-3 sm:px-6 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
              {/* Format & Quality Picker */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-400">Format:</span>
                <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalFormatType('video')}
                    className={`min-h-[32px] inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition active:scale-95 duration-150 cursor-pointer ${
                      modalFormatType === 'video'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Video (MP4)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalFormatType('audio')}
                    className={`min-h-[32px] inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition active:scale-95 duration-150 cursor-pointer ${
                      modalFormatType === 'audio'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>Audio (MP3)</span>
                  </button>
                </div>

                {modalFormatType === 'video' && (
                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="text-xs text-slate-400">Quality:</span>
                    <select
                      value={modalQuality}
                      onChange={(e) => setModalQuality(e.target.value)}
                      className="min-h-[34px] bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium cursor-pointer"
                    >
                      <option value="best">Best Available (up to 1080p)</option>
                      <option value="1080p">1080p (Full HD)</option>
                      <option value="720p">720p (HD)</option>
                      <option value="480p">480p (SD)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Selection Buttons & Counter */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectNext30}
                  disabled={unQueuedCount === 0}
                  className="min-h-[34px] inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition active:scale-95 duration-150 disabled:opacity-40 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Select Next 30</span>
                </button>

                {modalSelectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleClearModalSelection}
                    className="min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition active:scale-95 duration-150 cursor-pointer"
                  >
                    Clear
                  </button>
                )}

                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    modalSelectedIds.size > 30
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : modalSelectedIds.size > 0
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Selected: {modalSelectedIds.size} / 30 max
                </span>
              </div>
            </div>

            {/* Error Banners */}
            {modalLimitError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalLimitError}</span>
              </div>
            )}
            {modalApiError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalApiError}</span>
              </div>
            )}

            {/* Items List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-2 max-h-[50vh]">
              {playlistMetadata.items.map((item, idx) => {
                const isAlreadyInBatch = existingBatchIds.has(item.id);
                const isSelected = modalSelectedIds.has(item.id);
                const batchItemInfo = isAlreadyInBatch ? items.find((i) => i.id === item.id) : null;

                return (
                  <div
                    key={`${item.id}-${idx}`}
                    onClick={() => {
                      if (!isAlreadyInBatch) {
                        toggleModalItem(item.id);
                      }
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition select-none ${
                      isAlreadyInBatch
                        ? 'bg-slate-900/40 border-slate-800/40 opacity-55 cursor-not-allowed'
                        : isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/50 cursor-pointer shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850 cursor-pointer'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="shrink-0">
                      {isAlreadyInBatch ? (
                        <div className="w-5 h-5 rounded border border-slate-700 bg-slate-800 flex items-center justify-center text-slate-500">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : isSelected ? (
                        <CheckSquare className="w-5 h-5 text-indigo-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                      )}
                    </div>

                    {/* Thumbnail */}
                    <div className="relative w-14 h-10 sm:w-16 sm:h-11 rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-600">
                          No Pic
                        </div>
                      )}
                    </div>

                    {/* Title & Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
                          {item.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                        {item.durationText && <span>{item.durationText}</span>}
                        <span className="font-mono text-slate-500">{item.id}</span>
                      </div>
                    </div>

                    {/* Status badge if already in batch */}
                    {isAlreadyInBatch && (
                      <div className="shrink-0">
                        {batchItemInfo?.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Completed</span>
                          </span>
                        )}
                        {(batchItemInfo?.status === 'downloading' || batchItemInfo?.status === 'processing') && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>In Progress</span>
                          </span>
                        )}
                        {batchItemInfo?.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            Queued
                          </span>
                        )}
                        {batchItemInfo?.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Failed
                          </span>
                        )}
                        {batchItemInfo?.status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-500 border border-slate-700">
                            Cancelled
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#161a31]/90 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                {modalSelectedIds.size > 0 ? (
                  <span>
                    Ready to add <strong className="text-white">{modalSelectedIds.size}</strong> video(s) as{' '}
                    <strong className="text-indigo-300">
                      {modalFormatType === 'audio' ? 'MP3 Audio' : `MP4 (${modalQuality})`}
                    </strong>
                  </span>
                ) : (
                  <span>Select up to 30 un-queued videos to add</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMoreModalOpen(false)}
                  disabled={isAddingItems}
                  className="min-h-[38px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition active:scale-95 duration-150 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleAddSelectedToQueue}
                  disabled={modalSelectedIds.size === 0 || modalSelectedIds.size > 30 || isAddingItems}
                  className="min-h-[38px] inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 duration-150 cursor-pointer"
                >
                  {isAddingItems ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Adding to Queue...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Selected to Queue ({modalSelectedIds.size})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
