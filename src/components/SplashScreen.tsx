import React, { useEffect, useState, useRef } from 'react';
import { ResolvedTheme, resolveEffectiveTheme, getInitialThemePreference } from './ThemeSwitcher';

interface SplashScreenProps {
  onFinish?: () => void;
  theme?: ResolvedTheme;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, theme: propTheme }) => {
  const [stage, setStage] = useState<'visible' | 'fading' | 'hidden'>('visible');
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // Determine effective theme synchronously at initial render
  const [effectiveTheme, setEffectiveTheme] = useState<ResolvedTheme>(() => {
    if (propTheme) return propTheme;
    if (typeof document !== 'undefined') {
      if (document.documentElement.classList.contains('light')) return 'light';
      if (document.documentElement.classList.contains('dark')) return 'dark';
    }
    return resolveEffectiveTheme(getInitialThemePreference());
  });

  // Keep in sync if propTheme changes
  useEffect(() => {
    if (propTheme) {
      setEffectiveTheme(propTheme);
    }
  }, [propTheme]);

  // Track initial render timestamp to compensate for React mount/render latency
  const mountTimestampRef = useRef<number>(
    typeof performance !== 'undefined' ? performance.now() : Date.now()
  );

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsedSinceRender = now - mountTimestampRef.current;

    // Visual duration requirement: EXACTLY 5 SECONDS (5,000ms).
    // Compensates for React hydration/commit latency so total duration is exactly 5,000ms.
    const totalRemaining = Math.max(0, 5000 - elapsedSinceRender);
    const fadeDelay = Math.max(0, totalRemaining - 300);

    const fadeTimer = prefersReducedMotion
      ? null
      : setTimeout(() => {
          setStage('fading');
        }, fadeDelay);

    const finishTimer = setTimeout(() => {
      setStage('hidden');
      if (onFinishRef.current) onFinishRef.current();
    }, totalRemaining);

    return () => {
      if (fadeTimer) clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, []);

  if (stage === 'hidden') return null;

  const isLight = effectiveTheme === 'light';

  return (
    <div
      className={`splash-screen-container fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-300 ease-out select-none ${
        isLight ? 'bg-[#f8fafc] text-slate-900' : 'bg-[#070b14] text-white'
      } ${stage === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      aria-label="Welcome to YTdownloader"
      role="dialog"
      aria-modal="true"
    >
      {/* Background ambient radial glow */}
      <div
        className={`absolute inset-0 pointer-events-none ${
          isLight
            ? 'bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.12)_0%,_rgba(241,245,249,0.5)_45%,_transparent_70%)]'
            : 'bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.15)_0%,_transparent_60%)]'
        }`}
      />

      {/* Content wrapper */}
      <div className="relative flex flex-col items-center space-y-6 px-4 text-center">
        {/* Existing YTdownloader Logo with scale/fade and subtle glow */}
        <div className="relative group">
          <div
            className={`absolute -inset-2 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 rounded-2xl animate-pulse-glow ${
              isLight ? 'blur-md opacity-30' : 'blur-lg opacity-60'
            }`}
          />
          <div
            className={`relative h-16 w-24 sm:h-20 sm:w-28 rounded-2xl bg-[#FF0000] flex items-center justify-center transform animate-slide-up ${
              isLight ? 'shadow-xl shadow-red-500/25' : 'shadow-2xl shadow-red-600/50'
            }`}
          >
            <div className="w-0 h-0 border-y-[12px] sm:border-y-[14px] border-y-transparent border-l-[20px] sm:border-l-[24px] border-l-white ml-1.5" />
          </div>
        </div>

        {/* Title Reveal */}
        <div className="space-y-2 transform animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h1
            className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            Welcome to{' '}
            <span
              className={`bg-clip-text text-transparent ${
                isLight
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-indigo-600'
                  : 'bg-gradient-to-r from-red-400 via-rose-300 to-indigo-300'
              }`}
            >
              YTdownloader
            </span>
          </h1>
          <p
            className={`text-xs sm:text-sm font-medium ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}
          >
            Fast, Free, & Clean YouTube Downloader
          </p>
        </div>

        {/* Lightweight loading indicator */}
        <div
          className={`splash-track w-44 sm:w-56 h-1 rounded-full overflow-hidden mt-2 ${
            isLight
              ? 'bg-slate-200 border border-slate-300/80 shadow-inner'
              : 'bg-slate-800 border border-slate-700/50'
          }`}
        >
          <div
            className={`h-full rounded-full animate-splash-progress ${
              isLight
                ? 'bg-gradient-to-r from-red-600 via-indigo-600 to-purple-600'
                : 'bg-gradient-to-r from-red-500 via-indigo-500 to-purple-500'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
