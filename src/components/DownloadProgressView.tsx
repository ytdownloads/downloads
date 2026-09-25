import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Check,
  Cpu,
  Layers,
} from 'lucide-react';
import { DownloadJobData } from '../types/index';
import { cancelDownload, getDownloadFileUrl } from '../services/api';
import {
  useAutoDownload,
  isItemAlreadyDownloaded,
  markItemAlreadyDownloaded,
  triggerBrowserFileDownload,
} from '../services/autoDownload';
import { sanitizeErrorMessage } from '../utils/errorSanitizer';

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
  const [autoDownload, toggleAutoDownload] = useAutoDownload();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [downloadTriggered, setDownloadTriggered] = useState<boolean>(() =>
    isItemAlreadyDownloaded(job.jobId)
  );

  const timerRef = useRef<{ interval?: ReturnType<typeof setInterval>; timeout?: ReturnType<typeof setTimeout> } | null>(null);

  const { status, progress } = job;
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isCancelled = status === 'cancelled';
  const isActive = status === 'preparing' || status === 'downloading' || status === 'processing';

  const isAudio =
    job.formatId.toLowerCase().includes('audio') ||
    job.formatId.toLowerCase().includes('mp3') ||
    job.formatId.toLowerCase().includes('m4a') ||
    job.formatId.toLowerCase().includes('wav') ||
    job.formatId.toLowerCase().includes('flac') ||
    job.formatId.toLowerCase().includes('opus');

  const stage = progress.stage || (
    isCompleted ? 'completed' :
    status === 'processing' ? 'merging' :
    status === 'preparing' ? 'preparing' :
    'downloading_video'
  );

  const isIndeterminate = Boolean(
    progress.isIndeterminate ||
    stage === 'merging' ||
    stage === 'processing' ||
    stage === 'finalizing'
  );

  const steps = isAudio
    ? [
        { id: 'prepare', label: '1. Prepare' },
        { id: 'audio', label: '2. Audio Stream' },
        { id: 'ffmpeg', label: '3. FFmpeg Process' },
        { id: 'finalize', label: '4. Finalize' },
        { id: 'ready', label: '5. Ready' },
      ]
    : [
        { id: 'prepare', label: '1. Prepare' },
        { id: 'video', label: '2. Video Stream' },
        { id: 'audio', label: '3. Audio Stream' },
        { id: 'ffmpeg', label: '4. FFmpeg Mux' },
        { id: 'finalize', label: '5. Finalize' },
        { id: 'ready', label: '6. Ready' },
      ];

  let currentStepIndex = 1;
  if (isCompleted) {
    currentStepIndex = isAudio ? 6 : 7;
  } else if (stage === 'finalizing') {
    currentStepIndex = isAudio ? 4 : 5;
  } else if (stage === 'merging' || stage === 'processing') {
    currentStepIndex = isAudio ? 3 : 4;
  } else if (stage === 'downloading_audio') {
    currentStepIndex = isAudio ? 2 : 3;
  } else if (stage === 'downloading_video') {
    currentStepIndex = 2;
  } else if (stage === 'preparing') {
    currentStepIndex = 1;
  }

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

  const handleTriggerDownload = useCallback(() => {
    // Clear countdown timer if active
    if (timerRef.current) {
      if (timerRef.current.interval) clearInterval(timerRef.current.interval);
      if (timerRef.current.timeout) clearTimeout(timerRef.current.timeout);
      timerRef.current = null;
    }
    setCountdown(null);
    setDownloadTriggered(true);
    markItemAlreadyDownloaded(job.jobId);

    const fileUrl = getDownloadFileUrl(job.jobId);
    triggerBrowserFileDownload(
      fileUrl,
      job.fileName || (isAudio ? 'audio.mp3' : 'video.mp4')
    );
  }, [job.jobId, job.fileName, isAudio]);

  const handleCancelCountdown = useCallback(() => {
    if (timerRef.current) {
      if (timerRef.current.interval) clearInterval(timerRef.current.interval);
      if (timerRef.current.timeout) clearTimeout(timerRef.current.timeout);
      timerRef.current = null;
    }
    setCountdown(null);
    setDownloadTriggered(true);
    markItemAlreadyDownloaded(job.jobId);
  }, [job.jobId]);

  // 3-Second Auto Download countdown effect
  useEffect(() => {
    if (!autoDownload || !isCompleted) {
      if (timerRef.current) {
        if (timerRef.current.interval) clearInterval(timerRef.current.interval);
        if (timerRef.current.timeout) clearTimeout(timerRef.current.timeout);
        timerRef.current = null;
        setCountdown(null);
      }
      return;
    }

    // Skip if already downloaded in this session or timer already active
    if (downloadTriggered || isItemAlreadyDownloaded(job.jobId) || timerRef.current) {
      return;
    }

    setCountdown(3);
    let remaining = 3;

    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
      }
    }, 1000);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      timerRef.current = null;
      setCountdown(null);
      handleTriggerDownload();
    }, 3000);

    timerRef.current = { interval, timeout };
  }, [autoDownload, isCompleted, downloadTriggered, job.jobId, handleTriggerDownload]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        if (timerRef.current.interval) clearInterval(timerRef.current.interval);
        if (timerRef.current.timeout) clearTimeout(timerRef.current.timeout);
      }
    };
  }, []);

  return (
    <div className="w-full max-w-3xl bg-[#0f172a]/95 border border-indigo-500/30 rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden text-left animate-slide-up">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-600/15 via-purple-600/10 to-transparent rounded-full blur-3xl -z-10 pointer-events-none"></div>

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4 mb-6">
        <div className="flex items-center space-x-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Download Job Active</span>
          </span>
          <span className="text-xs text-slate-500 font-mono hidden sm:inline">
            [{job.jobId.slice(0, 8)}]
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Auto Download Toggle */}
          <button
            type="button"
            onClick={() => toggleAutoDownload()}
            aria-label={`Toggle auto download. Currently ${autoDownload ? 'ON' : 'OFF'}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition active:scale-95 duration-150 cursor-pointer min-h-[36px] ${
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

          <button
            type="button"
            onClick={onReset}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors focus:outline-none cursor-pointer py-1"
          >
            ← New Search
          </button>
        </div>
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
              <span className="capitalize">
                {isCompleted
                  ? 'Completed'
                  : isFailed
                  ? 'Failed'
                  : isCancelled
                  ? 'Cancelled'
                  : progress.stage
                  ? progress.stage.replace(/_/g, ' ')
                  : status}
              </span>
            </span>

            {/* Format label */}
            <span className="text-xs text-slate-400 font-mono bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
              {job.formatId}
            </span>
          </div>
        </div>
      </div>

      {/* Pipeline Stage Stepper */}
      <div className="mb-5 bg-slate-900/40 border border-slate-800/70 rounded-2xl p-4">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-0.5">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Processing Pipeline</span>
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            {isCompleted
              ? 'All stages verified'
              : isFailed
              ? 'Pipeline halted'
              : isCancelled
              ? 'Pipeline cancelled'
              : `Stage ${Math.min(currentStepIndex, steps.length)} of ${steps.length}`}
          </span>
        </div>

        <div className={`grid ${isAudio ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6'} gap-1.5`}>
          {steps.map((s, idx) => {
            const stepNum = idx + 1;
            const isStepDone = currentStepIndex > stepNum || isCompleted;
            const isStepActive = currentStepIndex === stepNum && !isCompleted && !isFailed && !isCancelled;
            const isStepFailed = currentStepIndex === stepNum && isFailed;

            return (
              <div
                key={s.id}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all ${
                  isStepDone
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : isStepActive
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-sm shadow-indigo-500/20'
                    : isStepFailed
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : 'bg-slate-900/60 border-slate-800 text-slate-500'
                }`}
              >
                <div className="shrink-0">
                  {isStepDone ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : isStepActive ? (
                    <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                  ) : isStepFailed ? (
                    <AlertCircle className="w-3 h-3 text-rose-400" />
                  ) : (
                    <span className="w-3 h-3 rounded-full border border-slate-700 flex items-center justify-center text-[9px] text-slate-500">
                      {stepNum}
                    </span>
                  )}
                </div>
                <span className="truncate leading-none">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Bar & Real Metrics */}
      <div className="space-y-3.5 py-1">
        {/* Progress header: Real stage message & Percentage */}
        <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
          <span className="text-slate-300 flex items-center space-x-2 truncate pr-2">
            {isActive && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />}
            <span className="truncate">
              {isCompleted
                ? 'Download complete & verified'
                : isFailed
                ? 'Download interrupted'
                : isCancelled
                ? 'Download cancelled by user'
                : progress.stageMessage ||
                  (progress.stage === 'preparing'
                    ? 'Connecting to media server...'
                    : progress.stage === 'downloading_video'
                    ? 'Downloading video stream...'
                    : progress.stage === 'downloading_audio'
                    ? 'Downloading audio stream...'
                    : progress.stage === 'merging'
                    ? 'Merging video and audio streams (FFmpeg)...'
                    : progress.stage === 'processing'
                    ? 'Processing media with FFmpeg...'
                    : progress.stage === 'finalizing'
                    ? 'Finalizing and verifying media file...'
                    : 'Downloading media stream...')}
            </span>
          </span>

          <span className="font-bold font-mono text-indigo-300 text-sm sm:text-base shrink-0">
            {isCompleted
              ? '100%'
              : isIndeterminate
              ? 'Processing'
              : progress.percentage !== null
              ? `${progress.percentage}%`
              : '...'}
          </span>
        </div>

        {/* The Progress Bar */}
        <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700/60 p-0.5 relative">
          {isIndeterminate && isActive ? (
            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500 w-full animate-pulse" />
          ) : (
            <div
              className={`h-full rounded-full transition-all duration-300 relative overflow-hidden ${
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
            >
              {isActive && !isCompleted && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              )}
            </div>
          )}
        </div>

        {/* Real Metrics Row: Size | Speed | ETA */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1 font-mono gap-y-1">
          <div>
            {isCompleted || job.fileSize ? (
              <span className="text-emerald-400 font-semibold">
                Final size: {formatBytes(job.fileSize || progress.totalBytes)}
              </span>
            ) : progress.stage === 'finalizing' ? (
              <span className="text-indigo-300">Calculating final file size...</span>
            ) : progress.stage === 'merging' || progress.stage === 'processing' ? (
              <span className="text-slate-400">FFmpeg stream muxing in progress</span>
            ) : progress.downloadedBytes !== null && progress.totalBytes !== null ? (
              <span>
                {formatBytes(progress.downloadedBytes)} / {formatBytes(progress.totalBytes)}
              </span>
            ) : progress.downloadedBytes !== null ? (
              <span>{formatBytes(progress.downloadedBytes)} transferred</span>
            ) : progress.stage === 'preparing' ? (
              <span className="text-slate-400">Initializing stream pipeline...</span>
            ) : (
              <span className="text-slate-400">Awaiting stream data...</span>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {!isIndeterminate && progress.speedBytesPerSecond ? (
              <span className="text-slate-300">{formatSpeed(progress.speedBytesPerSecond)}</span>
            ) : null}

            {!isIndeterminate && progress.etaSeconds !== null && progress.etaSeconds > 0 ? (
              <span className="text-indigo-400 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatEta(progress.etaSeconds)}</span>
              </span>
            ) : null}

            {isIndeterminate && isActive ? (
              <span className="text-purple-300 flex items-center space-x-1 text-[11px]">
                <Cpu className="w-3.5 h-3.5" />
                <span>FFmpeg active</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Error Display if Failed */}
      {isFailed && job.error && (
        <div className="mt-4 p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 flex items-start space-x-3 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-rose-200">[{job.error.code}]</span>{' '}
            {sanitizeErrorMessage(job.error.message, job.error.code)}
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
            className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-rose-300 hover:text-rose-200 transition active:scale-95 duration-150 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="w-full space-y-3">
            {/* Download Complete State Banner */}
            <div className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-semibold animate-check-pop shadow-md shadow-emerald-500/10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                </div>
                <div>
                  <span className="font-bold text-white block sm:inline">Download Complete</span>
                  <span className="text-slate-400 text-xs hidden sm:inline sm:ml-2">• Verified with native yt-dlp/FFmpeg</span>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                100% Ready
              </span>
            </div>

            {/* Auto download countdown banner */}
            {autoDownload && countdown !== null && (
              <div className="w-full flex items-center justify-between gap-2 p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    Auto download in{' '}
                    <span key={countdown} className="inline-block animate-countdown-pop font-bold text-white">
                      {countdown}s
                    </span>
                    ...
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelCountdown}
                  className="min-h-[32px] inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition active:scale-95 duration-150 cursor-pointer"
                  title="Cancel auto download"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>
            )}

            {/* Downloaded status badge */}
            {downloadTriggered && (
              <div className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Downloaded</span>
              </div>
            )}

            {/* Browser multiple downloads permission notice if auto download is ON */}
            {autoDownload && (
              <div className="w-full flex items-center justify-center gap-1.5 text-slate-400 text-xs text-center">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span>Your browser may ask permission to allow multiple downloads.</span>
              </div>
            )}

            <div className="w-full flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleTriggerDownload}
                className="flex-1 min-h-[52px] inline-flex items-center justify-center space-x-2.5 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition active:scale-[0.99] duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
              >
                <ArrowDownToLine className="w-5 h-5" />
                <span>
                  {downloadTriggered ? 'Save File Again' : 'Save Downloaded File'}
                </span>
              </button>

              <button
                type="button"
                onClick={onReset}
                className="sm:flex-none min-h-[44px] inline-flex items-center justify-center space-x-2 px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition active:scale-95 duration-150 cursor-pointer"
              >
                <span>Download Another</span>
              </button>
            </div>
          </div>
        )}

        {(isFailed || isCancelled) && (
          <div className="w-full flex flex-wrap items-center gap-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="min-h-[44px] inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition active:scale-95 duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              className="min-h-[44px] inline-flex items-center space-x-1.5 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition active:scale-95 duration-150 cursor-pointer"
            >
              <span>Back to Search</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
