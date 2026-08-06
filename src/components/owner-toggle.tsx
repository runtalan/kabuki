'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { OwnerFilter } from '@/lib/owner-filter';
import { OwnerAvatar } from '@/components/owner-badge';

const SEGMENTS: { value: OwnerFilter; label: string }[] = [
  { value: 'renato', label: 'Renato' },
  { value: 'claudia', label: 'Claudia' },
  { value: 'all', label: 'All' },
];

// Household-wide "who's spending" filter shown top-right on Home, Spending,
// and Transactions. Defaults to driving the `?owner=` URL search param (so
// server-rendered pages just read searchParams) — pass `onChange` to run it
// in controlled mode instead, for pages (like Transactions) that already own
// their filter state client-side.
export function OwnerToggle({
  value,
  onChange,
}: {
  value: OwnerFilter;
  onChange?: (next: OwnerFilter) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setOwner = (next: OwnerFilter) => {
    if (onChange) {
      onChange(next);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'all') {
      params.delete('owner');
    } else {
      params.set('owner', next);
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ''}`);
  };

  return (
    <div className="flex items-center gap-1 bg-muted/40 rounded-full p-1">
      {SEGMENTS.map((seg) => (
        <button
          key={seg.value}
          onClick={() => setOwner(seg.value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            value === seg.value
              ? 'bg-background text-foreground shadow-sm border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <OwnerAvatar owner={seg.value === 'all' ? 'joint' : seg.value} className="w-4 h-4" />
          {seg.label}
        </button>
      ))}
    </div>
  );
}
