'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

// A failed initial-load fetch used to resolve to a silently empty page —
// indistinguishable from "you genuinely have zero rows." This makes the
// failure visible and gives the user a way to retry without a full reload.
export function FetchErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 mb-6">
      <div className="flex items-center gap-3 min-w-0">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <p className="text-sm text-foreground">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-500/25 transition-colors flex-shrink-0"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Retry
      </button>
    </div>
  );
}
