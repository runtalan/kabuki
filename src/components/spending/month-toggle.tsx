'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toMonthParam } from '@/lib/date';

// Prev/next month navigator — drives the ?month=YYYY-MM search param so the
// whole page (server-rendered) re-fetches for the selected month. Reads its
// own pathname/search params so it works unmodified on any page (Spending,
// Cash Flow, ...) and preserves whatever other filters (e.g. ?owner=) are
// already in the URL instead of dropping them on navigation.
export function MonthToggle({
  refDate,
  isCurrentMonth,
}: {
  refDate: string;
  isCurrentMonth: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const date = new Date(refDate);
  const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const go = (delta: number) => {
    const next = new Date(date.getFullYear(), date.getMonth() + delta, 1);
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', toMonthParam(next));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-1 bg-muted/40 rounded-full px-1 py-1">
      <button
        onClick={() => go(-1)}
        className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"
        aria-label="Previous month"
        title="Previous month"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm font-semibold text-foreground px-2 min-w-[9rem] text-center">
        {label}
      </span>
      <button
        onClick={() => go(1)}
        disabled={isCurrentMonth}
        className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Next month"
        title="Next month"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
