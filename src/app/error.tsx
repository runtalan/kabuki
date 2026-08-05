'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// Next.js App Router error boundary — catches render-time exceptions
// anywhere under this segment (which, with no nested error.tsx files, means
// anywhere in the app) instead of falling through to the default dev/prod
// error screen. `reset()` retries rendering the segment without a full
// navigation; Home is the fallback for errors that keep recurring.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled render error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          This page hit an unexpected error. It's been logged — try again, or head back to Home.
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/home"
            className="px-4 py-2.5 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            Go to Home
          </Link>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-6 text-left text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 overflow-x-auto">
            {error.message}
          </pre>
        )}
      </div>
    </div>
  );
}
