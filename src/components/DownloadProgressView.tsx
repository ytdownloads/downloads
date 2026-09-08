import React, { useState } from 'react';
import {
  Download,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Clock,
  ArrowDownToLine,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { DownloadJobData } from '../types/index';
import { cancelDownload, getDownloadFileUrl } from '../services/api';

interface DownloadProgressViewProps {
  job: DownloadJobData;
  thumbnail?: string;
  onReset: () => void;
  onRetry?: () => void;
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

export const DownloadProgressView: React.FC<DownloadProgressViewProps> = ({
  job,
  thumbnail,
  onReset,
  onRetry,
}) => {
  const [cancelling, setCancelling] = useState(false);
  const [downloadTriggered, setDownloadTriggered] = useState(false);

  const { status, progress } = job;
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isCancelled = status === 'cancelled';
  const isActive = status === 'preparing' || status === 'downloading' || status === 'processing';

  const handleCancel = async () => {
    try {
      setCancelling(true);
      await cancelDownload(job.jobId);
    } catch (err) {
      console.error('Failed to cancel download', err);
    } finally {
      setCancelling(false);
    }
  };

  const handleTriggerDownload = () => {
    const fileUrl = getDownloadFileUrl(job.jobId);
    setDownloadTriggered(true);
    // Trigger browser file download
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = job.fileName || 'video.mp4';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-3xl bg-[#0f172a]/95 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden text-left animate-fade-in">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-600/15 via-purple-600/10 to-transparent rounded-full blur-3xl -z-10 pointer-events-none"></div>

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
        <div className="flex items-center space-x-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Download Job Active</span>
          </span>
          <span className="text-xs text-slate-500 font-mono hidden sm:inline">
            [{job.jobId.slice(0, 8)}]
          </span>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="text-xs text-slate-400 hover:text-slate-200 transition focus:outline-none"
        >
          ← New Search
        </button>
      </div>

      {/* Video Banner Row */}
      <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 mb-6">
        {/* Thumbnail */}
        <div className="relative w-full sm:w-40 aspect-video rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700/60 shadow-md">
          {thumbnail ? (
            <img src={thumbnail} alt={job.title || 'Video'} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600">
              <Download className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Title & Status badge */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight line-clamp-2 leading-snug">
            {job.title || 'Processing video...'}
          </h2>

          <div className="mt-2.5 flex items-center space-x-3">
            {/* Status Pill */}
            <span
              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                isCompleted
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : isFailed
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : isCancelled
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : isFailed ? (
                <AlertCircle className="w-3.5 h-3.5" />
              ) : isCancelled ? (
                <XCircle className="w-3.5 h-3.5" />
              ) : (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span className="capitalize">{status}</span>
            </span>

            {/* Format label */}
            <span className="text-xs text-slate-400 font-mono bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
              {job.formatId}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar & Real Metrics */}
      <div className="space-y-4 py-2">
        {/* Progress header: Percentage & Size */}
        <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
          <span className="text-slate-300">
            {isCompleted
              ? 'Ready for download'
              : status === 'processing'
              ? 'Merging video and audio streams (FFmpeg)...'
              : status === 'preparing'
              ? 'Connecting to media server...'
              : isFailed
              ? 'Download interrupted'
              : isCancelled
              ? 'Download cancelled by user'
              : 'Downloading media stream...'}
          </span>

          <span className="font-bold font-mono text-indigo-300 text-sm sm:text-base">
            {progress.percentage !== null ? `${progress.percentage}%` : isCompleted ? '100%' : '...'}
          </span>
        </div>

        {/* The Progress Bar */}
        <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700/60 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isCompleted
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : isFailed
                ? 'bg-rose-500'
                : isCancelled
                ? 'bg-amber-500'
                : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500'
            }`}
            style={{
              width: `${
                isCompleted
                  ? 100
                  : progress.percentage !== null
                  ? Math.max(progress.percentage, 4)
                  : isActive
                  ? 25
                  : 0
              }%`,
            }}
          ></div>
        </div>

        {/* Real Metrics Row: Size | Speed | ETA */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1 font-mono gap-y-1">
          <div>
            {progress.downloadedBytes !== null && progress.totalBytes !== null ? (
              <span>
                {formatBytes(progress.downloadedBytes)} / {formatBytes(progress.totalBytes)}
              </span>
            ) : job.fileSize ? (
              <span>Total size: {formatBytes(job.fileSize)}</span>
            ) : (
              <span>Calculating size...</span>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {progress.speedBytesPerSecond && (
              <span className="text-slate-300">{formatSpeed(progress.speedBytesPerSecond)}</span>
            )}

            {progress.etaSeconds !== null && progress.etaSeconds > 0 && (
              <span className="text-indigo-400 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatEta(progress.etaSeconds)}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error Display if Failed */}
      {isFailed && job.error && (
        <div className="mt-4 p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 flex items-start space-x-3 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-rose-200">[{job.error.code}]</span> {job.error.message}
          </div>
        </div>
      )}

      {/* Action Buttons Bar */}
      <div className="pt-6 mt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
        {isActive && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-rose-300 hover:text-rose-200 transition focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
          >
            {cancelling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                <span>Terminating Process...</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Cancel Download</span>
              </>
            )}
          </button>
        )}

        {isCompleted && (
          <div className="w-full flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleTriggerDownload}
              className="flex-1 inline-flex items-center justify-center space-x-2.5 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <ArrowDownToLine className="w-5 h-5" />
              <span>
                {downloadTriggered ? 'Save File Again' : 'Save Downloaded File'}
              </span>
            </button>

            <button
              type="button"
              onClick={onReset}
              className="sm:flex-none inline-flex items-center justify-center space-x-2 px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            >
              <span>Download Another</span>
            </button>
          </div>
        )}

        {(isFailed || isCancelled) && (
          <div className="w-full flex items-center space-x-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center space-x-1.5 px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
            >
              <span>Back to Search</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
