// Single source of truth for owner emoji + color across accounts,
// transactions, and reports — keep any owner-related UI wired through here
// so "Renato = 👦 blue" / "Claudia = 👧 pink" never drifts between pages.
export const OWNERS = {
  renato: { label: 'Renato', emoji: '👦', color: '#3b82f6' }, // blue
  claudia: { label: 'Claudia', emoji: '👧', color: '#8b5cf6' }, // purple
  joint: { label: 'Joint', emoji: '🤝', color: '#10b981' }, // green
} as const;

export type OwnerKey = keyof typeof OWNERS;

export function getOwner(owner?: string | null) {
  return OWNERS[(owner as OwnerKey) || 'joint'] || OWNERS.joint;
}

interface OwnerBadgeProps {
  owner?: string | null;
  className?: string;
}

export function OwnerBadge({ owner, className = '' }: OwnerBadgeProps) {
  const info = getOwner(owner);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{ backgroundColor: info.color + '1a', color: info.color }}
      title={info.label}
    >
      <span>{info.emoji}</span>
      {info.label}
    </span>
  );
}
