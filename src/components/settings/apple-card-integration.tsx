'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Copy, Check, RefreshCw, Trash2, Loader } from 'lucide-react';
import { OWNERS, OwnerAvatar } from '@/components/owner-badge';

type Owner = 'renato' | 'claudia';

interface OwnerStatus {
  owner: Owner;
  configured: boolean;
  lastUsedAt: string | null;
  accountName: string | null;
}

function formatLastUsed(iso: string | null) {
  if (!iso) return 'Never synced yet';
  const d = new Date(iso);
  return `Last synced ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

export function AppleCardIntegration({ isDemo }: { isDemo: boolean }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<Owner>('renato');
  const [statuses, setStatuses] = useState<Record<Owner, OwnerStatus | null>>({
    renato: null,
    claudia: null,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [revealed, setRevealed] = useState<{ owner: Owner; endpoint: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const fetchStatus = () => {
    fetch('/api/settings/apple-card')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.integrations) return;
        const next: Record<Owner, OwnerStatus | null> = { renato: null, claudia: null };
        for (const s of data.integrations as OwnerStatus[]) {
          if (s.owner === 'renato' || s.owner === 'claudia') next[s.owner] = s;
        }
        setStatuses(next);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const status = statuses[selectedOwner];

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setCopied(false);
    try {
      const res = await fetch('/api/settings/apple-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: selectedOwner }),
      });
      const data = await res.json();
      if (res.ok) {
        setRevealed({ owner: selectedOwner, endpoint: data.endpoint });
        fetchStatus();
      } else {
        setError(data.error || 'Failed to generate token');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async () => {
    if (
      !confirm(
        `Revoke ${OWNERS[selectedOwner].label}'s Apple Card Sync token? Their Shortcut will stop working until a new one is generated.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/settings/apple-card?owner=${selectedOwner}`, { method: 'DELETE' });
    if (res.ok) {
      setRevealed((prev) => (prev?.owner === selectedOwner ? null : prev));
      fetchStatus();
    }
  };

  const handleCopy = () => {
    if (!revealed) return;
    navigator.clipboard.writeText(revealed.endpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <p className="text-sm font-semibold text-foreground">Apple Card Sync</p>
          <div className="inline-flex p-0.5 rounded-lg bg-muted border border-border text-sm">
            {(['renato', 'claudia'] as const).map((owner) => (
              <button
                key={owner}
                type="button"
                onClick={() => setSelectedOwner(owner)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                  selectedOwner === owner
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <OwnerAvatar owner={owner} className="w-4 h-4" />
                {OWNERS[owner].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-muted-foreground">
            {loading
              ? 'Loading…'
              : status?.configured
              ? formatLastUsed(status.lastUsedAt)
              : `Not set up yet for ${OWNERS[selectedOwner].label}`}
          </p>
          <div className="flex items-center gap-2">
            {status?.configured && (
              <button
                onClick={handleRevoke}
                disabled={isDemo}
                className="p-2 rounded-lg border border-border text-muted-foreground hover:text-red-500 hover:bg-red-500/5 transition-colors disabled:opacity-50"
                title={`Revoke ${OWNERS[selectedOwner].label}'s token`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={isDemo || generating}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {generating ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : status?.configured ? (
                <RefreshCw className="w-3.5 h-3.5" />
              ) : null}
              {status?.configured ? 'Regenerate' : `Generate for ${OWNERS[selectedOwner].label}`}
            </button>
          </div>
        </div>

        {isDemo && (
          <p className="text-xs text-muted-foreground mt-2">View-only in demo mode.</p>
        )}
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

        {revealed && revealed.owner === selectedOwner && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">
              Save this now — it won&apos;t be shown again. Paste it into {OWNERS[selectedOwner].label}&apos;s
              Shortcut, &ldquo;Get Contents of URL&rdquo; step.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 truncate px-2.5 py-1.5 rounded-md bg-background border border-border text-xs font-mono text-foreground">
                {revealed.endpoint}
              </code>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                title="Copy"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {status?.configured && status.accountName && (
          <p className="text-xs text-muted-foreground mt-2">
            Synced charges post to {OWNERS[selectedOwner].label}&apos;s{' '}
            <span className="font-medium text-foreground">{status.accountName}</span> account.
          </p>
        )}
      </div>

      <button
        onClick={() => setHelpOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-2.5 border-t border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        How does this work?
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${helpOpen ? 'rotate-180' : ''}`} />
      </button>
      {helpOpen && (
        <div className="px-5 py-4 border-t border-border bg-muted/20 text-xs text-muted-foreground space-y-2 leading-relaxed">
          <p>
            Apple Card Sync automates expense tracking by connecting Apple Wallet to Kabuki through an
            iPhone Shortcut. Pick whose card you&apos;re setting up above — Renato and Claudia each have their
            own token and their own Apple Card account, so charges never get attributed to the wrong
            person. Set up a personal automation with a{' '}
            <span className="font-medium text-foreground">Transaction</span> trigger (Settings → Shortcuts →
            Automation → Apple Card Transaction), and have it POST the charge to that person&apos;s endpoint below.
          </p>
          <p>
            Nothing about the Apple Card or bank credentials is ever stored — the Shortcut only ever sends a
            merchant name and amount to the URL, authenticated by a secret token unique to that person. The
            token can be revoked and regenerated any time from here.
          </p>
          <p>
            Example request body the Shortcut should POST as JSON:{' '}
            <code className="px-1 py-0.5 rounded bg-background border border-border font-mono">
              {'{ "merchant": "Blue Bottle Coffee", "amount": 6.5 }'}
            </code>
          </p>
        </div>
      )}
    </div>
  );
}
