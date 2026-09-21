import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorAlertProps {
  code?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  code,
  message,
  onRetry,
  onDismiss,
}) => {
  return (
    <div
      className="w-full max-w-3xl rounded-2xl bg-rose-950/30 border border-rose-800/60 p-4 sm:p-5 shadow-xl transition animate-slide-up"
      role="alert"
    >
      <div className="flex items-start space-x-3.5">
        <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 shrink-0 mt-0.5">
          <AlertCircle className="w-5 h-5 text-rose-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-rose-200">Analysis Failed</h4>
            {code && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-rose-900/60 border border-rose-700/50 text-rose-300">
                {code}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-rose-300/90 leading-relaxed break-words">{message}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="min-h-[36px] inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-rose-900/40 hover:bg-rose-900/60 border border-rose-700/60 text-xs font-medium text-rose-200 transition active:scale-95 duration-150 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="text-xs text-rose-400 hover:text-rose-200 transition focus:outline-none cursor-pointer py-1"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
