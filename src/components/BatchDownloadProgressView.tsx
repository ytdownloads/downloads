import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  FolderArchive,
  RotateCcw,
  ArrowDownToLine,
  ListOrdered,
} from 'lucide-react';
import { BatchJobData } from '../types/index';
import {
  cancelBatchDownload,
  retryBatchDownload,
  getBatchZipUrl,
  getBatchItemFileUrl,
} from '../services/api';

interface BatchDownloadProgressViewProps {
  batch: BatchJobData;
  onReset: () => void;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatSpeed(bytesPerSec: number | null): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '';
  return `${formatBytes(bytesPerSec)}/s`;
}

function formatEta(seconds: number | null): string {
  if (seconds === null || seconds < 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `ETA ${mins}m ${secs}s`;
  return `ETA ${secs}s`;
}

export const BatchDownloadProgressView: React.FC<BatchDownloadProgressViewProps> = ({
  batch,
  onReset,
}) => {
  const [cancelling, setCancelling] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

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
  } = batch;

  const isCompleted = status === 'completed';
  const isCompletedWithErrors = status === 'completed_with_errors';
  const isCancelled = status === 'cancelled';
  const isFailed = status === 'failed';
  const isActive = status === 'queued' || status === 'processing';

  const inFlightCount = items.filter(
    (i) => i.status === 'downloading' || i.status === 'processing' || i.status === 'pending'
  ).length;

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
    link.download = `${playlistTitle || 'Playlist'}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloadingZip(false), 2000);
  };

  const handleDownloadItem = (itemId: string, fileName?: string) => {
    const fileUrl = getBatchItemFileUrl(batchJobId, itemId);
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || `video_${itemId}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header Summary Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#161a31] to-[#0e1122] border border-purple-500/25 p-6 md:p-8 shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 space-y-6">
          {/* Top Row: Title & Action Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <ListOrdered className="w-3.5 h-3.5" />
                  Playlist Batch
                </span>
                <span className="text-xs text-slate-400">
                  Format: <span className="text-slate-200 font-medium">{formatId}</span>
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight truncate">
                {playlistTitle || 'YouTube Playlist'}
              </h2>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {completedItems > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={downloadingZip}
                  aria-label="Download all completed videos as ZIP archive"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium text-sm shadow-lg shadow-purple-500/20 active:scale-98 transition disabled:opacity-50"
                  title="Download all completed videos in a ZIP archive"
                >
                  {downloadingZip ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FolderArchive className="w-4 h-4" />
                  )}
                  <span>Download All (ZIP)</span>
                </button>
              )}

              {isActive && (
                <button
                  type="button"
                  onClick={handleCancelAll}
                  disabled={cancelling}
                  aria-label="Cancel all remaining downloads in this batch"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold transition active:scale-98 disabled:opacity-50"
                >
                  {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>Cancel All</span>
                </button>
              )}

              {failedItems > 0 && !isActive && (
                <button
                  type="button"
                  onClick={handleRetryFailed}
                  disabled={retrying}
                  aria-label="Retry failed downloads in this batch"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition active:scale-98 disabled:opacity-50"
                >
                  {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  <span>Retry Failed ({failedItems})</span>
                </button>
              )}

              <button
                type="button"
                onClick={onReset}
                aria-label="Reset and enter a new YouTube URL"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 text-xs font-semibold transition active:scale-98"
              >
                <span>New URL</span>
              </button>
            </div>
          </div>

          {/* Stats Badges & Overall Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="text-slate-300 font-medium">
                  {isCompleted && 'All downloads completed!'}
                  {isCompletedWithErrors && 'Batch completed with some errors'}
                  {isActive && `Downloading playlist queue... (${completedItems}/${totalItems})`}
                  {isCancelled && 'Batch download cancelled'}
                  {isFailed && 'Batch download failed'}
                </span>
              </div>
              <span className="font-mono text-purple-300 font-bold">{overallPercentage}%</span>
            </div>

            {/* Overall Progress Bar */}
            <div className="w-full h-3 bg-slate-900/80 rounded-full overflow-hidden border border-slate-700/40 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isCompleted
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/30'
                    : isCompletedWithErrors
                    ? 'bg-gradient-to-r from-amber-500 to-orange-400 shadow-lg shadow-amber-500/30'
                    : isCancelled
                    ? 'bg-slate-600'
                    : isFailed
                    ? 'bg-rose-600'
                    : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-lg shadow-purple-500/30'
                }`}
                style={{ width: `${Math.max(overallPercentage, 2)}%` }}
              />
            </div>

            {/* Counter badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/50 border border-slate-800 text-xs">
                <span className="text-slate-400">Total Items</span>
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
                  <Loader2 className={`w-3.5 h-3.5 ${isActive ? 'animate-spin' : ''}`} /> In Flight
                </span>
                <span className="font-bold text-blue-300">{inFlightCount}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-rose-950/30 border border-rose-500/20 text-xs">
                <span className="text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Failed
                </span>
                <span className="font-bold text-rose-300">
                  {failedItems}
                  {cancelledItems > 0 ? ` (${cancelledItems} stopped)` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Playlist Item Queue Card */}
      <div className="rounded-2xl bg-[#101322]/90 border border-purple-500/20 shadow-2xl backdrop-blur-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <span>Playlist Items Queue</span>
            <span className="text-xs font-normal text-slate-400">({items.length} videos)</span>
          </h3>
          <span className="text-xs text-slate-500">Worker Concurrency: 2 active</span>
        </div>

        {/* Scrollable list of items */}
        <div className="divide-y divide-slate-800/60 max-h-[520px] overflow-y-auto">
          {items.map((item, index) => {
            const isItemActive = item.status === 'downloading' || item.status === 'processing';
            const isItemComplete = item.status === 'completed';
            const isItemFailed = item.status === 'failed';
            const isItemPending = item.status === 'pending';
            const isItemCancelled = item.status === 'cancelled';

            return (
              <div
                key={item.id}
                className={`p-4 transition-colors ${
                  isItemActive
                    ? 'bg-purple-950/20 border-l-4 border-purple-500'
                    : isItemComplete
                    ? 'bg-emerald-950/10'
                    : isItemFailed
                    ? 'bg-rose-950/10'
                    : 'hover:bg-slate-800/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Index / Status Icon */}
                  <div className="w-8 text-center flex-shrink-0">
                    {isItemComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                    ) : isItemFailed ? (
                      <AlertCircle className="w-5 h-5 text-rose-400 mx-auto" />
                    ) : isItemActive ? (
                      <Loader2 className="w-5 h-5 text-purple-400 animate-spin mx-auto" />
                    ) : isItemCancelled ? (
                      <XCircle className="w-5 h-5 text-slate-500 mx-auto" />
                    ) : (
                      <span className="text-xs font-semibold text-slate-500">#{index + 1}</span>
                    )}
                  </div>

                  {/* Thumbnail */}
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt=""
                      className="w-16 h-10 object-cover rounded-lg border border-slate-700/50 flex-shrink-0 bg-slate-900"
                    />
                  ) : (
                    <div className="w-16 h-10 rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center text-xs text-slate-500 flex-shrink-0">
                      #{index + 1}
                    </div>
                  )}

                  {/* Title & Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      {isItemComplete && item.fileSize && (
                        <span>{formatBytes(item.fileSize)}</span>
                      )}
                      {isItemActive && (
                        <>
                          <span className="text-purple-300 font-mono">{item.percentage}%</span>
                          {item.speedBytesPerSecond ? (
                            <span>{formatSpeed(item.speedBytesPerSecond)}</span>
                          ) : null}
                          {item.etaSeconds ? <span>{formatEta(item.etaSeconds)}</span> : null}
                        </>
                      )}
                      {isItemPending && <span className="text-slate-500">Waiting for slot in queue</span>}
                      {isItemFailed && (
                        <span className="text-rose-400 truncate">
                          {item.error?.message || 'Download failed'}
                        </span>
                      )}
                      {isItemCancelled && <span className="text-slate-500">Cancelled</span>}
                    </div>

                    {/* Progress Bar for active item */}
                    {isItemActive && (
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-200"
                          style={{ width: `${Math.max(item.percentage, 3)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Item Action */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isItemComplete && (
                      <button
                        type="button"
                        onClick={() => handleDownloadItem(item.id, item.fileName)}
                        aria-label={`Download ${item.title}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition active:scale-95"
                        title="Download this file directly"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    )}

                    {isItemPending && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                        Queued
                      </span>
                    )}

                    {isItemActive && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {item.status === 'processing' ? 'Merging' : 'Downloading'}
                      </span>
                    )}

                    {isItemFailed && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Failed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
