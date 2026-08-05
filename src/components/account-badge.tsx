'use client';

// Distinct from OWNERS colors (blue/purple/green) so account identity never
// gets visually confused with who owns the account.
const PALETTE = ['#0ea5e9', '#f97316', '#14b8a6', '#eab308', '#6366f1', '#ef4444', '#22c55e', '#a855f7'];

function hashColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

interface AccountInfo {
  id: string;
  name?: string;
  displayName?: string | null;
  mask?: string | null;
  isManual?: boolean | null;
}

interface AccountBadgeProps {
  account?: AccountInfo | null;
  className?: string;
}

// Every place a transaction renders should show which account it belongs to
// — this is the single component for that so the color/initials/mask
// formatting never drifts between pages.
export function AccountBadge({ account, className = '' }: AccountBadgeProps) {
  if (!account) {
    return <span className={`text-xs text-muted-foreground ${className}`}>—</span>;
  }

  const label = account.displayName || account.name || 'Account';
  const color = hashColor(account.id);
  const initials = label.slice(0, 2).toUpperCase();

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title={label}>
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        {initials}
      </span>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {account.mask ? `••${account.mask}` : label}
      </span>
    </span>
  );
}
