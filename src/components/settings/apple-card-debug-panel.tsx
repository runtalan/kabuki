'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, X, RefreshCw, Loader } from 'lucide-react';
import { OwnerAvatar } from '@/components/owner-badge';

interface LogEntry {
  id: string;
  method: string;
  owner: string | null;
  statusCode: number;
  headers: Record<string, string>;
  queryParams: Record<string, string> | null;
  body: string | null;
  parsed: Record<string, unknown> | null;
  error: string | null;
  transactionId: string | null;
  createdAt: string;
}

interface DebugTransaction {
  id: string;
  name: string;
  merchant: string | null;
  amount: string;
  type: string;
  date: string;
  notes: string | null;
  owner: string | null;
  createdAt: string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

function StatusPill({ status }: { status: number }) {
  const ok = status >= 200 && status < 300;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium ${
        ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-500'
      }`}
    >
      {status}
    </span>
  );
}

// Dev/debug tooling for the Apple Card Sync endpoint — shows every request
// that's hit it (headers included, since the Shortcut payload shape is
// still being dialed in) plus the transactions it produced, with a manual
// delete for cleaning up messed-up test transactions. Not meant for
// non-technical use — this is deliberately raw/dense, not polished.
export function AppleCardDebugPanel({ isDemo }: { isDemo: boolean }) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [txns, setTxns] = useState<DebugTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Split so the effect below can trigger a fetch without a synchronous
  // setState call in its body (setLoading only happens in the .then chain,
  // an async callback, not the effect's own call stack).
  const load = () =>
    fetch('/api/settings/apple-card/debug-log')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setLogs(data.logs || []);
        setTxns(data.transactions || []);
      });

  const fetchData = () => {
    setLoading(true);
    load().finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    load();
  }, [open]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/settings/apple-card/debug-log/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTxns((prev) => prev.filter((t) => t.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
      >
        <span>Apple Card debug log</span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-border">
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Raw view of every request to the Apple Card ingest endpoint, and the transactions it created.
            </p>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 flex-shrink-0"
              title="Refresh"
            >
              {loading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Recent transactions — deletable */}
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-semibold text-foreground mb-2">Recent Apple Card transactions</p>
            {txns.length === 0 ? (
              <p className="text-xs text-muted-foreground">None yet.</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {txns.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 text-xs"
                  >
                    {tx.owner && <OwnerAvatar owner={tx.owner} className="w-4 h-4 flex-shrink-0" />}
                    <span className="font-medium text-foreground truncate flex-shrink-0 max-w-[160px]">
                      {tx.merchant || tx.name}
                    </span>
                    <span className={`font-mono flex-shrink-0 ${tx.type === 'credit' ? 'text-emerald-600' : 'text-foreground'}`}>
                      ${Math.abs(parseFloat(tx.amount)).toFixed(2)}
                    </span>
                    <span className="text-muted-foreground flex-shrink-0">
                      {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {tx.notes && <span className="text-muted-foreground truncate">{tx.notes}</span>}
                    <span className="flex-1" />
                    <button
                      onClick={() => handleDelete(tx.id)}
                      disabled={isDemo || deletingId === tx.id}
                      className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 flex-shrink-0"
                      title="Delete this transaction"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Raw request log */}
          <div className="px-5 py-3">
            <p className="text-xs font-semibold text-foreground mb-2">Request log</p>
            {logs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No requests recorded yet.</p>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {logs.map((log) => {
                  const expanded = expandedLog === log.id;
                  return (
                    <div key={log.id} className="border border-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedLog(expanded ? null : log.id)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-muted/40 transition-colors text-left"
                      >
                        {expanded ? (
                          <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="font-mono text-muted-foreground flex-shrink-0">{formatTime(log.createdAt)}</span>
                        <span className="font-mono font-medium flex-shrink-0">{log.method}</span>
                        <StatusPill status={log.statusCode} />
                        {log.owner && <OwnerAvatar owner={log.owner} className="w-3.5 h-3.5 flex-shrink-0" />}
                        {log.parsed?.merchant ? (
                          <span className="truncate text-foreground">{String(log.parsed.merchant)}</span>
                        ) : log.error ? (
                          <span className="truncate text-red-500">{log.error}</span>
                        ) : null}
                      </button>
                      {expanded && (
                        <div className="px-2.5 py-2 border-t border-border bg-muted/20 space-y-2 text-xs">
                          {log.error && (
                            <div>
                              <p className="font-semibold text-red-500 mb-0.5">Error</p>
                              <p className="text-red-500">{log.error}</p>
                            </div>
                          )}
                          {log.parsed && (
                            <div>
                              <p className="font-semibold text-foreground mb-0.5">Parsed fields</p>
                              <pre className="font-mono bg-background border border-border rounded p-1.5 overflow-x-auto">
                                {JSON.stringify(log.parsed, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.queryParams && (
                            <div>
                              <p className="font-semibold text-foreground mb-0.5">Query params</p>
                              <pre className="font-mono bg-background border border-border rounded p-1.5 overflow-x-auto">
                                {JSON.stringify(log.queryParams, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.body && (
                            <div>
                              <p className="font-semibold text-foreground mb-0.5">Raw body</p>
                              <pre className="font-mono bg-background border border-border rounded p-1.5 overflow-x-auto whitespace-pre-wrap break-all">
                                {log.body}
                              </pre>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-foreground mb-0.5">Headers</p>
                            <pre className="font-mono bg-background border border-border rounded p-1.5 overflow-x-auto">
                              {JSON.stringify(log.headers, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
