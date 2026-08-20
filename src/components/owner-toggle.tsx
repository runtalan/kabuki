'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { OwnerFilter } from '@/lib/owner-filter';
import { OWNERS, OwnerAvatar } from '@/components/owner-badge';
import { useHousehold } from '@/hooks/use-household';

// Household-wide "who's spending" filter shown top-right on Home, Spending,
// and Transactions. Defaults to driving the `?owner=` URL search param (so
// server-rendered pages just read searchParams) — pass `onChange` to run it
// in controlled mode instead, for pages (like Transactions) that already own
// their filter state client-side.
//
// Segments come from the signed-in user's household: server pages pass
// `owners` (user.household.usernames) so the right names render immediately;
// client-only pages omit it and the household is resolved from the session.
// Until it's known, only "All" renders — never another household's names.
export function OwnerToggle({
  value,
  onChange,
  owners,
}: {
  value: OwnerFilter;
  onChange?: (next: OwnerFilter) => void;
  owners?: readonly string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const household = useHousehold(owners === undefined);
  const memberNames = owners ?? household?.usernames ?? [];
  const segments: { value: OwnerFilter; label: string }[] = [
    ...memberNames.map((u) => ({ value: u, label: OWNERS[u]?.label ?? u })),
    { value: 'all', label: 'All' },
  ];

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
    <div className="flex items-center gap-1.5 bg-muted/40 rounded-full p-1.5">
      {segments.map((seg) => {
        const hasPhoto = seg.value !== 'all' && !!OWNERS[seg.value]?.avatar;
        return (
          <div key={seg.value} className={hasPhoto ? 'relative group/avatar' : 'relative'}>
            <button
              onClick={() => setOwner(seg.value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${
                value === seg.value
                  ? 'bg-background text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <OwnerAvatar owner={seg.value === 'all' ? 'joint' : seg.value} className="w-6 h-6" />
              {seg.label}
            </button>

            {/* Bigger preview on hover — CSS-only so it works regardless of
                page scroll state; positioned below since this toggle lives
                at the very top of the page (an above-placed tooltip would
                run off-screen). */}
            {hasPhoto && (
              <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 opacity-0 scale-95 group-hover/avatar:opacity-100 group-hover/avatar:scale-100 transition-all duration-150 origin-top">
                <div className="w-24 h-24 rounded-full overflow-hidden shadow-2xl ring-4 ring-background border border-border">
                  <OwnerAvatar owner={seg.value} className="w-full h-full" />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
