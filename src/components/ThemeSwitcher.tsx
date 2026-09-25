import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'ytdl_theme_preference';

export function getInitialThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {}
  return 'system';
}

export function resolveEffectiveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === 'light') return 'light';
  if (pref === 'dark') return 'dark';
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

export function applyThemeToDom(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }

  // Update mobile browser chrome color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#0b0f19' : '#f8fafc');
  }
}

interface ThemeSwitcherProps {
  onThemeChange?: (theme: ResolvedTheme, preference: ThemePreference) => void;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ onThemeChange }) => {
  const [preference, setPreference] = useState<ThemePreference>(getInitialThemePreference);
  const [effectiveTheme, setEffectiveTheme] = useState<ResolvedTheme>(() => resolveEffectiveTheme(getInitialThemePreference()));
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Sync preference with DOM and listen to OS preference changes in system mode
  useEffect(() => {
    const resolved = resolveEffectiveTheme(preference);
    setEffectiveTheme(resolved);
    applyThemeToDom(resolved);
    if (onThemeChange) onThemeChange(resolved, preference);

    if (preference !== 'system') return;

    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemChange = (e: MediaQueryListEvent) => {
      const newResolved: ResolvedTheme = e.matches ? 'dark' : 'light';
      setEffectiveTheme(newResolved);
      applyThemeToDom(newResolved);
      if (onThemeChange) onThemeChange(newResolved, 'system');
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [preference]);

  // Close dropdown on outside click or escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectMode = (newPref: ThemePreference) => {
    setPreference(newPref);
    try {
      localStorage.setItem(STORAGE_KEY, newPref);
    } catch {}
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const getTriggerLabel = () => {
    if (preference === 'system') return `Theme: System (${effectiveTheme})`;
    return `Theme: ${preference.charAt(0).toUpperCase() + preference.slice(1)}`;
  };

  return (
    <div className="relative inline-block text-left shrink-0" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 sm:p-2.5 rounded-lg sm:rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 active:scale-95 border border-slate-300 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[30px] min-w-[30px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center cursor-pointer select-none"
        title={getTriggerLabel()}
        aria-label={getTriggerLabel()}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {preference === 'light' ? (
          <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 animate-theme-icon" />
        ) : preference === 'dark' ? (
          <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400 animate-theme-icon" />
        ) : (
          <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 dark:text-slate-300 animate-theme-icon" />
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-2 w-40 sm:w-44 rounded-xl py-1.5 px-1 bg-white/95 dark:bg-[#0c1222]/95 border border-slate-200 dark:border-slate-700/80 shadow-xl shadow-slate-300/40 dark:shadow-2xl dark:shadow-black/70 backdrop-blur-md z-50 animate-slide-up focus:outline-none select-none"
        >
          <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
            Appearance
          </div>

          {/* Option: Light */}
          <button
            type="button"
            role="menuitem"
            onClick={() => selectMode('light')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              preference === 'light'
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Light</span>
            </div>
            {preference === 'light' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
          </button>

          {/* Option: Dark */}
          <button
            type="button"
            role="menuitem"
            onClick={() => selectMode('dark')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              preference === 'dark'
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Moon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span>Dark</span>
            </div>
            {preference === 'dark' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
          </button>

          {/* Option: System Default */}
          <button
            type="button"
            role="menuitem"
            onClick={() => selectMode('system')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              preference === 'system'
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Monitor className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>System</span>
            </div>
            {preference === 'system' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
          </button>
        </div>
      )}
    </div>
  );
};
