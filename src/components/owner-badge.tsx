// Single source of truth for owner avatar/emoji + color across accounts,
// transactions, and reports — keep any owner-related UI wired through here
// so "Renato = photo, blue" / "Claudia = photo, purple" never drifts
// between pages. `emoji` remains as the fallback for `joint` (no photo of
// "both of them" makes sense) and for any plain-text context — a native
// `<select><option>` can't render an `<img>`, so those keep using it.
export const OWNERS = {
  renato: { label: 'Renato', emoji: '👦', color: '#3b82f6', avatar: '/avatars/renato.png' }, // blue
  claudia: { label: 'Claudia', emoji: '👧', color: '#8b5cf6', avatar: '/avatars/claudia.png' }, // purple
  joint: { label: 'Joint', emoji: '🤝', color: '#10b981', avatar: null }, // green
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
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{ backgroundColor: info.color + '1a', color: info.color }}
      title={info.label}
    >
      <OwnerAvatar owner={owner} className="w-3.5 h-3.5" />
      {info.label}
    </span>
  );
}

// Renders the person's actual photo for renato/claudia, falling back to the
// emoji (joint, or anything unrecognized) — the one place this branching
// lives so every consumer just gets "the right icon" for a given owner.
export function OwnerAvatar({
  owner,
  className = 'w-5 h-5',
}: {
  owner?: string | null;
  className?: string;
}) {
  const info = getOwner(owner);
  if (info.avatar) {
    // Tiny fixed-size avatar rendered in dozens of small inline contexts
    // (badges, pills, buttons) — not worth next/image's overhead here.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={info.avatar}
        alt={info.label}
        className={`${className} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <span className={`inline-flex items-center justify-center flex-shrink-0 ${className}`}>
      {info.emoji}
    </span>
  );
}
