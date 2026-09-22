import React, { useState, useEffect, useRef } from 'react';
import {
  Clipboard,
  Search,
  Zap,
  Layers,
  Sparkles,
  Gift,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  FolderDown,
  ArrowLeft,
} from 'lucide-react';
import {
  checkBackendHealth,
  analyzeUrl,
  createDownload,
  subscribeDownloadEvents,
  createBatchDownload,
  subscribeBatchEvents,
  getBatchStatus,
  ApiServiceError,
} from './services/api';
import { MediaInfoResult, DownloadJobData, BatchJobData, PlaylistMetadata } from './types/index';
import { SingleVideoView } from './components/SingleVideoView';
import { PlaylistView } from './components/PlaylistView';
import { DownloadProgressView } from './components/DownloadProgressView';
import { BatchDownloadProgressView } from './components/BatchDownloadProgressView';
import { ErrorAlert } from './components/ErrorAlert';
import { LegalPageView, LegalRoute } from './components/LegalPageView';
import { PremiumComingSoon } from './components/PremiumComingSoon';

type AppState = 'idle' | 'analyzing' | 'success' | 'downloading' | 'batch_downloading' | 'error';

export function App() {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<AppState>('idle');
  const [mediaData, setMediaData] = useState<MediaInfoResult | null>(null);
  const [downloadJob, setDownloadJob] = useState<DownloadJobData | null>(null);
  const [batchJob, setBatchJob] = useState<BatchJobData | null>(null);
  const [activePlaylistData, setActivePlaylistData] = useState<PlaylistMetadata | null>(() => {
    const match = window.location.pathname.match(/^\/downloads\/([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      try {
        const stored = sessionStorage.getItem(`ytdl_playlist_session_${match[1]}`);
        if (stored) return JSON.parse(stored);
      } catch {
        // ignore
      }
    }
    return null;
  });
  const [isStartingBatch, setIsStartingBatch] = useState(false);
  const [apiError, setApiError] = useState<{ code?: string; message: string } | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Legal routes state
  const [legalRoute, setLegalRoute] = useState<LegalRoute | null>(() => {
    const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
    if (path === '/privacy') return 'privacy';
    if (path === '/terms') return 'terms';
    if (path === '/dmca') return 'dmca';
    if (path === '/cookies') return 'cookies';
    if (path === '/disclaimer') return 'disclaimer';
    return null;
  });

  const [isDownloadsView, setIsDownloadsView] = useState<boolean>(() => {
    const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
    return path === '/downloads';
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const unsubscribeDownloadRef = useRef<(() => void) | null>(null);
  const unsubscribeBatchRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let isMounted = true;
    checkBackendHealth()
      .then((res) => {
        if (isMounted) {
          if (res.success && res.status === 'ok') {
            setBackendStatus('online');
          } else {
            setBackendStatus('offline');
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setBackendStatus('offline');
        }
      });

    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (unsubscribeDownloadRef.current) {
        unsubscribeDownloadRef.current();
      }
      if (unsubscribeBatchRef.current) {
        unsubscribeBatchRef.current();
      }
    };
  }, []);

  const loadBatchJob = async (jobId: string) => {
    if (unsubscribeBatchRef.current) {
      unsubscribeBatchRef.current();
      unsubscribeBatchRef.current = null;
    }
    setIsDownloadsView(false);
    setState('batch_downloading');
    setApiError(null);
    document.title = 'YTdownloader — Download Queue';
    try {
      const data = await getBatchStatus(jobId);
      setBatchJob(data);
      try {
        const stored = sessionStorage.getItem(`ytdl_playlist_session_${jobId}`);
        if (stored) {
          setActivePlaylistData(JSON.parse(stored));
        }
      } catch {
        // ignore
      }
      const unsub = subscribeBatchEvents(jobId, {
        onInit: (updated) => setBatchJob(updated),
        onUpdate: (updated) => setBatchJob(updated),
        onCancelled: (updated) => setBatchJob(updated),
      });
      unsubscribeBatchRef.current = unsub;
    } catch (err) {
      setState('error');
      setApiError({
        code: 'BATCH_NOT_FOUND',
        message:
          err instanceof Error
            ? err.message
            : 'Playlist batch download was not found or has expired.',
      });
    }
  };

  useEffect(() => {
    const pathname = window.location.pathname;
    const initialMatch = pathname.match(/^\/downloads\/([a-zA-Z0-9_-]+)/i);
    if (initialMatch && initialMatch[1]) {
      loadBatchJob(initialMatch[1]);
    } else if (pathname.toLowerCase().replace(/\/$/, '') === '/downloads') {
      setIsDownloadsView(true);
      document.title = 'YTdownloader — Downloads';
    }
  }, []);

  useEffect(() => {
    if (legalRoute) {
      switch (legalRoute) {
        case 'privacy':
          document.title = 'YTdownloader — Privacy Policy';
          break;
        case 'terms':
          document.title = 'YTdownloader — Terms of Service';
          break;
        case 'dmca':
          document.title = 'YTdownloader — DMCA / Copyright';
          break;
        case 'cookies':
          document.title = 'YTdownloader — Cookie Policy';
          break;
        case 'disclaimer':
          document.title = 'YTdownloader — Disclaimer';
          break;
      }
    } else if (isDownloadsView && !batchJob) {
      document.title = 'YTdownloader — Downloads';
    } else if (state === 'batch_downloading') {
      document.title = 'YTdownloader — Download Queue';
    } else {
      document.title = 'YTdownloader';
    }

    const handlePopState = () => {
      const pathname = window.location.pathname;
      const path = pathname.toLowerCase().replace(/\/$/, '');
      if (path === '/privacy') {
        setLegalRoute('privacy');
        setIsDownloadsView(false);
      } else if (path === '/terms') {
        setLegalRoute('terms');
        setIsDownloadsView(false);
      } else if (path === '/dmca') {
        setLegalRoute('dmca');
        setIsDownloadsView(false);
      } else if (path === '/cookies') {
        setLegalRoute('cookies');
        setIsDownloadsView(false);
      } else if (path === '/disclaimer') {
        setLegalRoute('disclaimer');
        setIsDownloadsView(false);
      } else if (path === '/downloads') {
        setLegalRoute(null);
        setIsDownloadsView(true);
      } else {
        setLegalRoute(null);
        setIsDownloadsView(false);
        const match = pathname.match(/^\/downloads\/([a-zA-Z0-9_-]+)/i);
        if (match && match[1]) {
          const jobId = match[1];
          if (!batchJob || batchJob.batchJobId !== jobId) {
            loadBatchJob(jobId);
          }
        } else if (path === '' || path === '/') {
          if (unsubscribeBatchRef.current) {
            unsubscribeBatchRef.current();
            unsubscribeBatchRef.current = null;
          }
          setBatchJob(null);
          setState('idle');
          document.title = 'YTdownloader';
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [legalRoute, isDownloadsView, state, batchJob]);

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setUrl(text.trim());
          setInputError(null);
          setApiError(null);
        }
      } else {
        setInputError('Clipboard access restricted. Please paste with Ctrl+V into the field.');
      }
    } catch {
      setInputError('Could not read from clipboard. Please paste manually.');
    }
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setInputError('Please enter a YouTube video or playlist URL.');
      return;
    }

    try {
      const parsed = new URL(trimmedUrl);
      if (parsed.protocol !== 'https:') {
        setInputError('Only secure HTTPS URLs are supported (e.g. https://www.youtube.com/...).');
        return;
      }
    } catch {
      setInputError('Please enter a valid URL.');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setInputError(null);
    setApiError(null);
    setState('analyzing');

    try {
      const data = await analyzeUrl(trimmedUrl, abortControllerRef.current.signal);
      setMediaData(data);
      if (data.type === 'playlist') {
        setActivePlaylistData(data);
      }
      setState('success');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }

      setState('error');
      if (err instanceof ApiServiceError) {
        setApiError({ code: err.code, message: err.message });
      } else {
        setApiError({
          code: 'CLIENT_ERROR',
          message:
            err instanceof Error
              ? err.message
              : 'Failed to connect to the server. Please check your connection.',
        });
      }
    }
  };

  const handleStartDownload = async (formatId: string) => {
    if (!mediaData || mediaData.type !== 'video') return;

    if (unsubscribeDownloadRef.current) {
      unsubscribeDownloadRef.current();
      unsubscribeDownloadRef.current = null;
    }

    setState('downloading');
    setApiError(null);

    // Initial placeholder job state while awaiting API
    const initialJob: DownloadJobData = {
      jobId: '',
      url: mediaData.webpageUrl,
      title: mediaData.title,
      formatId,
      status: 'preparing',
      progress: {
        status: 'preparing',
        percentage: 0,
        downloadedBytes: 0,
        totalBytes: null,
        speedBytesPerSecond: null,
        etaSeconds: null,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setDownloadJob(initialJob);

    try {
      const { jobId, status } = await createDownload(mediaData.webpageUrl, formatId);

      setDownloadJob((prev) => (prev ? { ...prev, jobId, status } : null));

      // Subscribe to Server-Sent Events for real progress
      const unsub = subscribeDownloadEvents(jobId, {
        onStatus: (updated) => setDownloadJob(updated),
        onProgress: (updated) => setDownloadJob(updated),
        onCompleted: (updated) => setDownloadJob(updated),
        onError: (updated) => setDownloadJob(updated),
        onCancelled: (updated) => setDownloadJob(updated),
      });

      unsubscribeDownloadRef.current = unsub;
    } catch (err) {
      setState('error');
      if (err instanceof ApiServiceError) {
        setApiError({ code: err.code, message: err.message });
      } else {
        setApiError({
          code: 'DOWNLOAD_FAILED',
          message:
            err instanceof Error ? err.message : 'Failed to start download.',
        });
      }
    }
  };

  const handleStartBatchDownload = async (
    items: Array<{
      id: string;
      url: string;
      title: string;
      durationSeconds?: number;
      thumbnail?: string;
    }>,
    formatId: string
  ) => {
    if (!mediaData || mediaData.type !== 'playlist' || items.length === 0) return;

    if (unsubscribeBatchRef.current) {
      unsubscribeBatchRef.current();
      unsubscribeBatchRef.current = null;
    }

    setIsStartingBatch(true);
    setApiError(null);

    const initialBatch: BatchJobData = {
      batchJobId: '',
      playlistTitle: mediaData.title,
      formatId,
      status: 'queued',
      totalItems: items.length,
      completedItems: 0,
      failedItems: 0,
      cancelledItems: 0,
      overallPercentage: 0,
      items: items.map((i) => ({
        id: i.id,
        url: i.url,
        title: i.title,
        durationSeconds: i.durationSeconds,
        thumbnail: i.thumbnail,
        formatId,
        status: 'pending',
        percentage: 0,
        downloadedBytes: 0,
        totalBytes: null,
        speedBytesPerSecond: null,
        etaSeconds: null,
      })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setBatchJob(initialBatch);
    setState('batch_downloading');

    try {
      const { batchJobId } = await createBatchDownload({
        playlistTitle: mediaData.title,
        formatId,
        items,
      });

      try {
        sessionStorage.setItem(`ytdl_playlist_session_${batchJobId}`, JSON.stringify(mediaData));
      } catch {
        // ignore
      }
      setActivePlaylistData(mediaData);

      setBatchJob((prev) => (prev ? { ...prev, batchJobId } : null));

      if (window.location.pathname !== `/downloads/${batchJobId}`) {
        window.history.pushState({}, '', `/downloads/${batchJobId}`);
      }
      document.title = 'YTdownloader — Download Queue';

      const unsub = subscribeBatchEvents(batchJobId, {
        onInit: (data) => setBatchJob(data),
        onUpdate: (data) => setBatchJob(data),
        onCancelled: (data) => setBatchJob(data),
      });

      unsubscribeBatchRef.current = unsub;
    } catch (err) {
      setState('error');
      if (err instanceof ApiServiceError) {
        setApiError({ code: err.code, message: err.message });
      } else {
        setApiError({
          code: 'BATCH_DOWNLOAD_FAILED',
          message: err instanceof Error ? err.message : 'Failed to start playlist batch download.',
        });
      }
    } finally {
      setIsStartingBatch(false);
    }
  };

  const navigateToLegal = (route: LegalRoute) => {
    if (window.location.pathname !== `/${route}`) {
      window.history.pushState({}, '', `/${route}`);
    }
    setLegalRoute(route);
    setIsDownloadsView(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToDownloads = () => {
    if (batchJob?.batchJobId) {
      if (window.location.pathname !== `/downloads/${batchJob.batchJobId}`) {
        window.history.pushState({}, '', `/downloads/${batchJob.batchJobId}`);
      }
      setState('batch_downloading');
      document.title = 'YTdownloader — Download Queue';
    } else {
      if (window.location.pathname !== '/downloads') {
        window.history.pushState({}, '', '/downloads');
      }
      setIsDownloadsView(true);
      document.title = 'YTdownloader — Downloads';
    }
    setLegalRoute(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToHome = () => {
    if (unsubscribeBatchRef.current) {
      unsubscribeBatchRef.current();
      unsubscribeBatchRef.current = null;
    }
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    setLegalRoute(null);
    setIsDownloadsView(false);
    setBatchJob(null);
    if (state === 'batch_downloading') {
      setState('idle');
    }
    document.title = 'YTdownloader';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavSection = (sectionId: string) => {
    if (legalRoute) {
      navigateToHome();
      setTimeout(() => scrollToSection(sectionId), 100);
    } else {
      scrollToSection(sectionId);
    }
  };

  const handleReset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (unsubscribeDownloadRef.current) {
      unsubscribeDownloadRef.current();
      unsubscribeDownloadRef.current = null;
    }
    if (unsubscribeBatchRef.current) {
      unsubscribeBatchRef.current();
      unsubscribeBatchRef.current = null;
    }
    setUrl('');
    setState('idle');
    setMediaData(null);
    setDownloadJob(null);
    setBatchJob(null);
    setApiError(null);
    setInputError(null);
    navigateToHome();
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const faqs = [
    {
      q: 'How do I download a video or playlist?',
      a: 'Simply paste any YouTube video or playlist link into the input box and click Analyze. The application automatically detects whether it is a single video or a playlist, retrieves available streams via yt-dlp, and displays the format options.',
    },
    {
      q: 'Is YTdownloader completely free to use?',
      a: 'Yes, 100% free with no registration or hidden fees. It is built for personal archiving and content you have permission to download.',
    },
    {
      q: 'Can I download entire YouTube playlists at once?',
      a: 'Yes. Paste a playlist link and the application detects all videos, provides batch selection controls (Select All / Deselect All), and prepares the queue.',
    },
    {
      q: 'How does real progress reporting work?',
      a: 'Progress is streamed in real-time directly from the underlying yt-dlp process via Server-Sent Events (SSE), calculating exact bytes, download speeds, and ETAs without any simulated increments.',
    },
    {
      q: 'What YouTube URL formats are supported?',
      a: 'We support standard watch links (https://www.youtube.com/watch?v=...), short links (https://youtu.be/...), and playlist links (https://www.youtube.com/playlist?list=...). Non-HTTPS and untrusted domains are safely rejected.',
    },
  ];

  return (
    <div
      className={`min-h-screen ${
        isDarkTheme ? 'bg-[#070b14]' : 'bg-[#0a0f1d]'
      } text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-300`}
    >
      {/* 1. Header with YouTube-Style Red Logo, Nav Links, Theme Toggle */}
      <header className="border-b border-indigo-500/20 bg-[#0c1222]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Name */}
          <div
            className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer select-none"
            onClick={handleReset}
          >
            {/* YouTube-style Red Logo with White Play Triangle */}
            <div className="h-7 w-10 sm:h-8 sm:w-11 rounded-lg bg-[#FF0000] flex items-center justify-center shadow-lg shadow-red-600/30 hover:scale-105 active:scale-95 transition-transform duration-150 shrink-0">
              <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[9px] border-l-white ml-0.5"></div>
            </div>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
              YTdownloader
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
            <button
              type="button"
              onClick={handleReset}
              className="hover:text-indigo-400 transition-colors duration-150 cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => handleNavSection('features')}
              className="hover:text-indigo-400 transition-colors duration-150 cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => handleNavSection('plans')}
              className="hover:text-indigo-400 transition-colors duration-150 cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Plans</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 leading-none">Soon</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavSection('faq')}
              className="hover:text-indigo-400 transition-colors duration-150 cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsDarkTheme(!isDarkTheme)}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 border border-slate-700/60 text-slate-300 hover:text-white transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {isDarkTheme ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>

            <div
              className={`inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium border transition-colors duration-200 ${
                backendStatus === 'online'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : backendStatus === 'offline'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              {backendStatus === 'online' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : backendStatus === 'offline' ? (
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
              )}
              <span className="hidden sm:inline">
                {backendStatus === 'online'
                  ? 'Backend Online'
                  : backendStatus === 'offline'
                  ? 'Backend Offline'
                  : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-3.5 sm:px-6 py-6 sm:py-12">
        {legalRoute ? (
          <LegalPageView
            route={legalRoute}
            onNavigateHome={navigateToHome}
            onNavigateRoute={navigateToLegal}
          />
        ) : state === 'batch_downloading' && batchJob ? (
          <div className="w-full">
            <BatchDownloadProgressView
              batch={batchJob}
              playlistMetadata={activePlaylistData || (mediaData?.type === 'playlist' ? mediaData : null)}
              onReset={handleReset}
              onBatchUpdated={(updated) => setBatchJob(updated)}
            />
          </div>
        ) : isDownloadsView ? (
          <div className="w-full max-w-xl py-12 px-6 rounded-3xl bg-[#0f172a]/95 border border-indigo-500/30 flex flex-col items-center justify-center space-y-5 shadow-2xl backdrop-blur-xl mx-auto my-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <FolderDown className="w-8 h-8 text-indigo-400" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-xl font-bold text-white tracking-tight">No Active Download Session</h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                You don't have an active single video or playlist batch download in progress. Paste a YouTube URL on the home page to start downloading.
              </p>
            </div>
            <button
              type="button"
              onClick={navigateToHome}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-xs sm:text-sm shadow-md shadow-indigo-500/30 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Home</span>
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center text-center">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-tight sm:leading-tight">
              Download YouTube Videos <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Fast, Free, and Easy
              </span>
            </h1>

        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
          Paste any YouTube video or playlist link and download in high quality.
        </p>

        {/* URL Input Box */}
        <form
          onSubmit={handleAnalyze}
          className="mt-8 sm:mt-10 w-full max-w-3xl"
          noValidate
        >
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-2xl blur opacity-35 group-hover:opacity-65 transition-opacity duration-300"></div>

            <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center bg-[#0f172a] border border-indigo-500/30 hover:border-indigo-500/50 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 rounded-2xl p-2 gap-2 shadow-2xl transition duration-200">
              <div className="relative flex-1 min-w-0 flex items-center">
                <input
                  type="url"
                  value={url}
                  disabled={state === 'analyzing' || state === 'downloading'}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (inputError) setInputError(null);
                    if (apiError) setApiError(null);
                  }}
                  placeholder="Paste YouTube URL"
                  className="w-full bg-transparent px-3 sm:px-4 py-3 text-slate-100 placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-0 disabled:opacity-60 font-sans truncate"
                  aria-label="Paste YouTube URL"
                />
                {url && state !== 'analyzing' && state !== 'downloading' && (
                  <button
                    type="button"
                    onClick={() => {
                      setUrl('');
                      handleReset();
                    }}
                    className="mr-2 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded focus:outline-none shrink-0 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePaste}
                  disabled={state === 'analyzing' || state === 'downloading'}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-4 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 active:scale-95 text-slate-300 hover:text-white text-sm font-medium border border-slate-700/70 transition duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 min-h-[44px] cursor-pointer"
                  title="Paste from clipboard"
                >
                  <Clipboard className="w-4 h-4" />
                  <span>Paste</span>
                </button>

                <button
                  type="submit"
                  disabled={state === 'analyzing' || state === 'downloading'}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 text-white font-semibold text-sm shadow-md shadow-indigo-500/30 transition duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-75 disabled:transform-none min-h-[44px] cursor-pointer"
                >
                  {state === 'analyzing' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Analyze</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {inputError && (
            <div
              className="mt-3 flex items-center justify-center space-x-2 text-rose-400 text-sm animate-fade-in"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{inputError}</span>
            </div>
          )}

          <div className="mt-3 text-xs text-slate-500">
            Supports YouTube videos and playlists • Paste URL to auto-detect
          </div>
        </form>

        {/* 3. Results / Active Download Section */}
        <section className="mt-8 sm:mt-10 w-full flex justify-center animate-slide-up">
          {state === 'analyzing' && (
            <div className="w-full max-w-xl py-12 px-6 rounded-3xl bg-[#0f172a]/80 border border-indigo-500/30 flex flex-col items-center justify-center space-y-4 shadow-2xl backdrop-blur-xl">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              </div>
              <div className="space-y-1 text-center">
                <h3 className="text-base font-bold text-white">Analyzing YouTube URL</h3>
                <p className="text-xs text-slate-400">
                  Inspecting content type, video streams, and audio options with yt-dlp...
                </p>
              </div>
            </div>
          )}

          {state === 'error' && apiError && (
            <ErrorAlert
              code={apiError.code}
              message={apiError.message}
              onRetry={() => handleAnalyze()}
              onDismiss={handleReset}
            />
          )}

          {/* Real Single Video Download Progress View */}
          {state === 'downloading' && downloadJob && (
            <DownloadProgressView
              job={downloadJob}
              thumbnail={mediaData?.thumbnail}
              onReset={handleReset}
              onRetry={() => handleStartDownload(downloadJob.formatId)}
            />
          )}



          {/* Single Video Card */}
          {state === 'success' && mediaData && mediaData.type === 'video' && (
            <SingleVideoView
              video={mediaData}
              onReset={handleReset}
              onStartDownload={handleStartDownload}
            />
          )}

          {/* Playlist Card */}
          {state === 'success' && mediaData && mediaData.type === 'playlist' && (
            <PlaylistView
              playlist={mediaData}
              onReset={handleReset}
              onStartBatch={handleStartBatchDownload}
              isStartingBatch={isStartingBatch}
            />
          )}
        </section>

        {/* 4. Features Section */}
        <section id="features" className="mt-20 w-full pt-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400 text-center mb-6">
            Key Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-indigo-500/20 hover:border-indigo-500/40 transition shadow-lg">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-bold text-white text-base">Super Fast</h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Instant metadata extraction and stream resolution powered by yt-dlp.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-purple-500/20 hover:border-purple-500/40 transition shadow-lg">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
                <Layers className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-bold text-white text-base">Supports Playlists</h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Seamlessly parses both single video links and full YouTube playlists.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-indigo-500/20 hover:border-indigo-500/40 transition shadow-lg">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="font-bold text-white text-base">High Quality</h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Choose from available resolutions up to 1080p, 4K, or extracted audio.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-emerald-500/20 hover:border-emerald-500/40 transition shadow-lg">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                <Gift className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-bold text-white text-base">100% Free</h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                No subscription, no accounts, and no hidden limitations.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Premium Plans & Accounts — Coming Soon Section */}
        <PremiumComingSoon />

        {/* 6. FAQ Section */}
        <section id="faq" className="mt-20 w-full max-w-3xl pt-6 text-left">
          <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400 text-center mb-2">
            Frequently Asked Questions
          </h2>
          <p className="text-center text-slate-400 text-xs mb-8">
            Everything you need to know about YTdownloader
          </p>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#0f172a]/80 border border-indigo-500/20 overflow-hidden transition"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between text-left font-semibold text-sm sm:text-base text-white focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-indigo-400 shrink-0 ml-3" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 ml-3" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
          </div>
        )}
      </main>

      {/* 6. Multi-Column Production Footer */}
      <footer className="border-t border-indigo-500/20 bg-[#0c1222]/90 backdrop-blur-md pt-16 pb-12 px-4 sm:px-6 mt-20">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* 3 Column Balanced Grid (Community & Support completely removed) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-left">
            {/* Col 1: Brand / About */}
            <div className="space-y-4 md:col-span-6 lg:col-span-5">
              <div
                className="flex items-center space-x-2.5 cursor-pointer select-none"
                onClick={navigateToHome}
              >
                <div className="h-6 w-9 rounded bg-[#FF0000] flex items-center justify-center shadow-md shadow-red-600/30">
                  <div className="w-0 h-0 border-y-[4px] border-y-transparent border-l-[7px] border-l-white ml-0.5"></div>
                </div>
                <span className="font-extrabold text-sm tracking-tight text-white">
                  YTdownloader
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                High-speed YouTube video and playlist archiving tool with native yt-dlp processing and streaming ZIP downloads.
              </p>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>System Operational</span>
              </div>
            </div>

            {/* Col 2: Products */}
            <div className="space-y-3 md:col-span-3 lg:col-span-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Products</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <a
                    href="/"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateToHome();
                    }}
                    className="hover:text-indigo-400 transition text-left block"
                  >
                    Home
                  </a>
                </li>
                <li>
                  <a
                    href={batchJob?.batchJobId ? `/downloads/${batchJob.batchJobId}` : '/downloads'}
                    onClick={(e) => {
                      e.preventDefault();
                      navigateToDownloads();
                    }}
                    className="hover:text-indigo-400 transition text-left block"
                  >
                    Downloads
                  </a>
                </li>
                <li>
                  <button type="button" onClick={navigateToHome} className="hover:text-indigo-400 transition text-left">
                    Single Video Downloader
                  </button>
                </li>
                <li>
                  <button type="button" onClick={navigateToHome} className="hover:text-indigo-400 transition text-left">
                    Playlist Batch Downloader
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => handleNavSection('plans')} className="hover:text-indigo-400 transition text-left">
                    Premium Plans (Coming Soon)
                  </button>
                </li>
                <li><span className="hover:text-indigo-400 transition cursor-default">MP4 1080p Full HD</span></li>
                <li><span className="hover:text-indigo-400 transition cursor-default">Audio MP3 Extraction</span></li>
                <li><span className="hover:text-indigo-400 transition cursor-default">Streaming ZIP Engine</span></li>
              </ul>
            </div>

            {/* Col 3: Legal */}
            <div className="space-y-3 md:col-span-3 lg:col-span-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Legal</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <button
                    type="button"
                    onClick={() => navigateToLegal('privacy')}
                    className="hover:text-indigo-400 transition text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateToLegal('terms')}
                    className="hover:text-indigo-400 transition text-left"
                  >
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateToLegal('dmca')}
                    className="hover:text-indigo-400 transition text-left"
                  >
                    DMCA / Copyright
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateToLegal('cookies')}
                    className="hover:text-indigo-400 transition text-left"
                  >
                    Cookie Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateToLegal('disclaimer')}
                    className="hover:text-indigo-400 transition text-left"
                  >
                    Disclaimer
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar with exact credit */}
          <div className="border-t border-slate-800/80 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center md:text-left">
            <p className="max-w-2xl text-[11px] leading-relaxed text-slate-400">
              YTdownloader is designed strictly for personal archiving and downloading content the user owns or has explicit permission to download. Platform DRM, access controls, and cipher-locks are not bypassed.
            </p>
            <div className="shrink-0 space-y-1 text-center md:text-right">
              <p className="font-semibold text-slate-300">
                @2026 YTdownloader All right reserved
              </p>
              <p className="text-[11px] text-slate-400 font-medium">
                Developed by Santosh K. R. Koli
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
