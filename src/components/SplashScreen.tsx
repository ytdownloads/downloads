import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [stage, setStage] = useState<'visible' | 'fading' | 'hidden'>('visible');

  useEffect(() => {
    // Show splash for 750ms, then initiate smooth 250ms fade-out (total ~1000ms)
    const fadeTimer = setTimeout(() => {
      setStage('fading');
    }, 750);

    const finishTimer = setTimeout(() => {
      setStage('hidden');
      if (onFinish) onFinish();
    }, 1000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  if (stage === 'hidden') return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#070b14] transition-opacity duration-300 ease-out select-none ${
        stage === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-label="Welcome to YTdownloader"
      role="dialog"
      aria-modal="true"
    >
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.15)_0%,_transparent_60%)] pointer-events-none" />

      {/* Content wrapper */}
      <div className="relative flex flex-col items-center space-y-6 px-4 text-center">
        {/* Existing YTdownloader Logo with scale/fade and subtle glow */}
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 rounded-2xl blur-lg opacity-60 animate-pulse-glow" />
          <div className="relative h-16 w-24 sm:h-20 sm:w-28 rounded-2xl bg-[#FF0000] flex items-center justify-center shadow-2xl shadow-red-600/50 transform animate-slide-up">
            <div className="w-0 h-0 border-y-[12px] sm:border-y-[14px] border-y-transparent border-l-[20px] sm:border-l-[24px] border-l-white ml-1.5" />
          </div>
        </div>

        {/* Title Reveal */}
        <div className="space-y-2 transform animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-red-400 via-rose-300 to-indigo-300 bg-clip-text text-transparent">
              YTdownloader
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Fast, Free, & Clean YouTube Downloader
          </p>
        </div>

        {/* Lightweight loading indicator */}
        <div className="w-44 sm:w-56 h-1 rounded-full bg-slate-800 overflow-hidden border border-slate-700/50 mt-2">
          <div className="h-full bg-gradient-to-r from-red-500 via-indigo-500 to-purple-500 rounded-full animate-splash-progress" />
        </div>
      </div>
    </div>
  );
};
