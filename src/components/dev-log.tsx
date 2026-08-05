'use client';

import { useState } from 'react';
import { Terminal, X, RefreshCw } from 'lucide-react';

interface DevLogEntry {
  id: string;
  institution: string;
  status: string;
  lastSyncedAt?: string | null;
  error?: string | null;
  accountCount: number;
  linkedAt?: string | null;
}

function formatTime(iso?: string | null) {
  if (!iso) return 'never';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function DevLog() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<DevLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const fetchLog = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dev-log');
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setFetchedAt(data.generatedAt);
      }
    } catch {
      // dev log is best-effort; stay quiet
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchLog();
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="w-96 max-h-72 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Developer Log
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={fetchLog}
                className="p-1.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setOpen(false)}
                title="Close"
                className="p-1.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            {entries.length === 0 && !loading && (
              <p className="py-2">— no connections linked —</p>
            )}
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="py-1.5 border-b border-zinc-200/60 dark:border-zinc-800/60 last:border-0"
              >
                <p>
                  <span className="text-zinc-600 dark:text-zinc-300">{entry.institution}</span>
                  {' · '}
                  {entry.accountCount} acct{entry.accountCount === 1 ? '' : 's'}
                  {' · '}
                  <span
                    className={
                      entry.status === 'error'
                        ? 'text-red-400'
                        : entry.status === 'syncing'
                        ? 'text-amber-500'
                        : 'text-emerald-500'
                    }
                  >
                    {entry.status === 'idle' ? 'synced' : entry.status}
                  </span>
                </p>
                <p className="text-zinc-400 dark:text-zinc-500">
                  last sync: {formatTime(entry.lastSyncedAt)}
                </p>
                {entry.error && (
                  <p className="text-red-400/80 break-words">err: {entry.error}</p>
                )}
              </div>
            ))}
            {fetchedAt && (
              <p className="pt-1.5 text-zinc-400/70 dark:text-zinc-600">
                refreshed {formatTime(fetchedAt)}
              </p>
            )}
          </div>
        </div>
      )}

      <button
        onClick={toggle}
        className={`p-2 rounded-lg border transition-all ${
          open
            ? 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
            : 'bg-zinc-100/80 dark:bg-zinc-900/80 border-zinc-200/70 dark:border-zinc-800/70 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
        }`}
        title="Developer log"
      >
        <Terminal className="w-4 h-4" />
      </button>
    </div>
  );
}
