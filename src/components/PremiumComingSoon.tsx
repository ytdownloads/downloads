import React from 'react';
import { Sparkles, User, Zap, ShieldCheck, Crown } from 'lucide-react';

export const PremiumComingSoon: React.FC = () => {
  return (
    <section id="plans" className="mt-20 w-full pt-6 text-left scroll-mt-20">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
          <span>Coming Soon</span>
        </div>

        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Premium Plans &amp; Accounts
        </h2>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl mx-auto">
          Personal accounts, premium download plans, download limits and secure UroPay payments are coming soon.
        </p>

        <div className="pt-2 flex justify-center">
          <span className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-gradient-to-r dark:from-indigo-600/30 dark:via-purple-600/30 dark:to-indigo-600/30 dark:border-indigo-500/40 dark:text-indigo-300 font-semibold text-xs sm:text-sm shadow-sm dark:shadow-lg dark:shadow-indigo-500/10">
            <Crown className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>Coming Soon</span>
          </span>
        </div>
      </div>

      {/* Feature Preview Cards (UI-only presentation) */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
        {/* Card 1: Personal Accounts */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0f172a]/90 border border-slate-200 dark:border-indigo-500/20 hover:border-indigo-500/40 transition duration-200 shadow-sm hover:shadow-md dark:shadow-lg flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Personal Accounts</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Save your download preferences, access your personal history, and sync across your devices.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">Status</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/60">
              Coming Soon
            </span>
          </div>
        </div>

        {/* Card 2: Premium Download Plans */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0f172a]/90 border border-slate-200 dark:border-purple-500/20 hover:border-purple-500/40 transition duration-200 shadow-sm hover:shadow-md dark:shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-l from-indigo-600 to-purple-600 text-[10px] font-bold text-white rounded-bl-xl uppercase tracking-wider">
            Future Plan
          </div>
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Premium Download Plans</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Higher download limits, priority queue allocation, and ultra-high-speed dedicated processing streams.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">Status</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30">
              Coming Soon
            </span>
          </div>
        </div>

        {/* Card 3: Secure UroPay Payments */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0f172a]/90 border border-slate-200 dark:border-emerald-500/20 hover:border-emerald-500/40 transition duration-200 shadow-sm hover:shadow-md dark:shadow-lg flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Secure UroPay Payments</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Fast, encrypted, and seamless payment checkout powered by trusted UroPay gateway integration.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">Status</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/60">
              Coming Soon
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
