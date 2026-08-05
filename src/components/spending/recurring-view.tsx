'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
  Check,
  Pencil,
  MoreVertical,
} from 'lucide-react';
import { MerchantAvatar as SharedMerchantAvatar } from '@/components/merchant-avatar';
import { useEscapeKey } from '@/hooks/use-escape-key';
import {
  FREQUENCY_LABELS,
  occurrencesInMonth,
  type Frequency,
  type RecurringEntry,
} from '@/lib/recurring-shared';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

const FREQUENCIES: Frequency[] = ['weekly', 'biweekly', 'monthly', 'yearly'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function money(value: number, decimals = 2) {
  return `$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

// Compact form for calendar cells, where space is tight: $1.2K, $69.84, $9.
function compactMoney(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1000) return `$${(abs / 1000).toFixed(2).replace(/\.?0+$/, '')}K`;
  return `$${abs.toFixed(2).replace(/\.00$/, '')}`;
}

function parseDay(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dueLabel(isoDate: string) {
  const next = parseDay(isoDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((next.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 14) return `Due in ${days} days`;
  return `On ${next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function MerchantAvatar({
  entry,
  size = 'md',
}: {
  entry: RecurringEntry;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'w-5 h-5' : 'w-8 h-8';
  const icon = size === 'sm' ? 'w-2.5 h-2.5' : 'w-4 h-4';
  return (
    <div className={`${dim} rounded-full ring-2 ring-card flex-shrink-0`} title={entry.merchant}>
      <SharedMerchantAvatar
        logoUrl={entry.logoUrl}
        categoryIcon={entry.categoryIcon}
        categoryColor={entry.categoryColor}
        name={entry.merchant}
        className={`${dim} rounded-full`}
        iconClassName={icon}
      />
    </div>
  );
}

// Shown in place of the calendar/list when detection has found nothing yet
// and no manual entries exist. Distinct from "filtered down to zero" — this
// is the true first-run state.
function RecurringEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-16">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <CalendarClock className="w-7 h-7 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No recurring transactions yet
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
        Detection looks for the same merchant charging you on a steady schedule — weekly,
        biweekly, monthly, or yearly. It needs at least two or three billing cycles of history to
        tell a real subscription from a coincidence, so check back once your accounts have synced
        a couple more months of transactions.
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add one manually
      </button>
      <p className="text-xs text-muted-foreground mt-3">
        Know a bill won't show up on its own? Add it directly instead of waiting on detection.
      </p>
    </div>
  );
}

export function RecurringView({
  entries: initialEntries,
  categories,
}: {
  entries: RecurringEntry[];
  categories: Category[];
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [cursor, setCursor] = useState(() => new Date());
  const [reviewIndex, setReviewIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringEntry | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEscapeKey(() => {
    if (addOpen) return setAddOpen(false);
    if (editing) return setEditing(null);
    if (menuOpenId) return setMenuOpenId(null);
    if (selectedDate) return setSelectedDate(null);
  }, addOpen || !!editing || !!menuOpenId || !!selectedDate);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long' });

  // Everything downstream that presents a recurring charge as settled fact —
  // the calendar, "Upcoming this month", the monthly totals, and the Summary
  // sentence — should only draw on entries the user has actually confirmed
  // (or added manually). A detection sitting in the "Is this recurring?"
  // queue is a guess, not yet a fact; counting it here would let an
  // unreviewed false positive quietly inflate "your recurring bills total
  // $X" before the user ever answers Yes/No. The List view intentionally
  // keeps showing every entry (reviewed or not) since that's where the
  // review queue itself lives.
  const confirmedEntries = useMemo(() => entries.filter((e) => !e.needsReview), [entries]);

  const occurrences = useMemo(
    () => occurrencesInMonth(confirmedEntries, year, month),
    [confirmedEntries, year, month]
  );

  const byDay = useMemo(() => {
    const map = new Map<number, typeof occurrences>();
    for (const occ of occurrences) {
      const day = parseDay(occ.date).getDate();
      const arr = map.get(day) || [];
      arr.push(occ);
      map.set(day, arr);
    }
    return map;
  }, [occurrences]);

  const selectedDayOccurrences = useMemo(
    () => (selectedDate ? occurrences.filter((o) => o.date === selectedDate) : []),
    [occurrences, selectedDate]
  );

  const reviewQueue = entries.filter((e) => e.needsReview);
  const reviewItem = reviewQueue[Math.min(reviewIndex, reviewQueue.length - 1)] || null;

  const bills = confirmedEntries.filter((e) => !e.isIncome);
  const income = confirmedEntries.filter((e) => e.isIncome);
  const monthlyOutflow = bills.reduce((s, e) => s + e.monthlyCost, 0);
  const monthlyInflow = income.reduce((s, e) => s + e.monthlyCost, 0);

  // "Upcoming this month" — only what's still ahead of today.
  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return occurrences
      .filter((o) => parseDay(o.date) >= today)
      .slice(0, 8);
  }, [occurrences]);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/recurring');
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries || []);
    }
    router.refresh();
  }, [router]);

  const review = async (entry: RecurringEntry, status: 'confirmed' | 'dismissed') => {
    setBusy(true);
    // Optimistic: clear it from the queue (or drop it entirely if dismissed)
    // so the panel advances immediately instead of waiting on the round-trip.
    setEntries((prev) =>
      status === 'dismissed'
        ? prev.filter((e) => e.merchantKey !== entry.merchantKey)
        : prev.map((e) =>
            e.merchantKey === entry.merchantKey ? { ...e, needsReview: false } : e
          )
    );
    try {
      await fetch('/api/recurring/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantKey: entry.merchantKey,
          merchantName: entry.merchant,
          status,
        }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  // Returns whether the entry was actually removed, so callers (like the day
  // detail modal) don't act on a confirm() the user cancelled.
  const remove = async (entry: RecurringEntry): Promise<boolean> => {
    setMenuOpenId(null);
    if (!confirm(`Remove "${entry.merchant}" from recurring?`)) return false;
    setEntries((prev) => prev.filter((e) => e.merchantKey !== entry.merchantKey));
    if (entry.id) {
      await fetch(`/api/recurring/${entry.id}`, { method: 'DELETE' });
    } else {
      // Detected but never reviewed — dismissing is the same as answering "No".
      await fetch('/api/recurring/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantKey: entry.merchantKey,
          merchantName: entry.merchant,
          status: 'dismissed',
        }),
      });
    }
    await refresh();
    return true;
  };

  const changeMonth = (delta: number) => setCursor(new Date(year, month + delta, 1));

  // Calendar grid: pad the first row so day 1 lands on its real weekday.
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">
      {/* Main panel */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-border">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Recurring Transactions
          </p>
          <div className="flex items-center gap-2">
            <div className="inline-flex p-0.5 rounded-lg bg-muted border border-border">
              <button
                onClick={() => setView('calendar')}
                className={`p-1.5 rounded-md transition-colors ${
                  view === 'calendar'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Calendar view"
              >
                <CalendarDays className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-1.5 rounded-md transition-colors ${
                  view === 'list'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-sm font-medium text-foreground hover:bg-muted/70 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        {entries.length === 0 ? (
          <RecurringEmptyState onAdd={() => setAddOpen(true)} />
        ) : view === 'calendar' ? (
          <div className="p-6">
            {/* Month navigator */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-foreground">
                {monthLabel} <span className="text-muted-foreground font-normal">{year}</span>
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => changeMonth(-1)}
                  title="Previous month"
                  className="p-2 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => changeMonth(1)}
                  title="Next month"
                  className="p-2 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {WEEKDAYS.map((d) => (
                <p
                  key={d}
                  className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center py-1"
                >
                  {d}
                </p>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((day, i) => {
                if (day === null) return <div key={`pad-${i}`} />;
                const dayOccurrences = byDay.get(day) || [];
                const isToday = isCurrentMonth && today.getDate() === day;
                const inflow = dayOccurrences
                  .filter((o) => o.entry.isIncome)
                  .reduce((s, o) => s + o.entry.amount, 0);
                const outflow = dayOccurrences
                  .filter((o) => !o.entry.isIncome)
                  .reduce((s, o) => s + o.entry.amount, 0);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => dayOccurrences.length > 0 && setSelectedDate(dayOccurrences[0].date)}
                    disabled={dayOccurrences.length === 0}
                    className={`min-h-[92px] rounded-lg border p-2 flex flex-col text-left transition-colors ${
                      isToday
                        ? 'border-foreground/40 bg-muted/40'
                        : dayOccurrences.length > 0
                          ? 'border-border bg-muted/20 hover:bg-muted/40 cursor-pointer'
                          : 'border-border/60 cursor-default'
                    }`}
                  >
                    <p
                      className={`text-xs mb-1 ${
                        isToday ? 'font-bold text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {day}
                    </p>

                    {dayOccurrences.length > 0 && (
                      <>
                        <div className="flex items-center -space-x-1.5 mb-1 flex-wrap">
                          {dayOccurrences.slice(0, 3).map((o, idx) => (
                            <MerchantAvatar key={`${o.entry.merchantKey}-${idx}`} entry={o.entry} size="sm" />
                          ))}
                          {dayOccurrences.length > 3 && (
                            <span className="text-[10px] font-semibold text-muted-foreground pl-2.5">
                              +{dayOccurrences.length - 3}
                            </span>
                          )}
                        </div>
                        <div className="mt-auto space-y-0.5">
                          {inflow > 0 && (
                            <p className="text-[10px] font-semibold text-emerald-500 leading-tight">
                              +{compactMoney(inflow)}
                            </p>
                          )}
                          {outflow > 0 && (
                            <p className="text-[10px] font-semibold text-foreground leading-tight">
                              {compactMoney(outflow)}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                    {dayOccurrences.length === 0 && (
                      <p className="text-[10px] text-muted-foreground/40 mt-auto">–</p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Summary */}
            <div className="mt-6 rounded-xl border border-primary/25 bg-primary/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                  Summary
                </p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {monthlyInflow >= monthlyOutflow
                    ? `Your recurring income of ${money(monthlyInflow, 0)}/mo comfortably covers ${money(monthlyOutflow, 0)}/mo in recurring bills across ${bills.length} ${bills.length === 1 ? 'subscription' : 'subscriptions'}. That leaves roughly ${money(monthlyInflow - monthlyOutflow, 0)} of headroom each month.`
                    : `Recurring bills total ${money(monthlyOutflow, 0)}/mo against ${money(monthlyInflow, 0)}/mo of detected recurring income — a shortfall of ${money(monthlyOutflow - monthlyInflow, 0)} that has to come from other income or savings.`}
              </p>
            </div>
          </div>
        ) : (
          /* List view */
          <div className="divide-y divide-border">
            {entries.map((entry) => (
                <div key={entry.merchantKey} className="flex items-center gap-3 px-6 py-3.5">
                  <MerchantAvatar entry={entry} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {entry.merchant}
                      </p>
                      {entry.priceIncreased && entry.previousAmount !== null && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 text-[10px] font-semibold flex-shrink-0">
                          <TrendingUp className="w-3 h-3" />
                          was {money(entry.previousAmount)}
                        </span>
                      )}
                      {entry.isManual && (
                        <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold flex-shrink-0">
                          Manual
                        </span>
                      )}
                      {entry.needsReview && (
                        <span
                          className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 text-[10px] font-semibold flex-shrink-0"
                          title="Not yet confirmed — answer 'Is this recurring?' to include it in your totals"
                        >
                          Pending review
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {FREQUENCY_LABELS[entry.frequency]}
                      <span className="mx-1.5 text-muted-foreground/50">•</span>
                      {dueLabel(entry.nextDate)}
                      {entry.categoryName && (
                        <>
                          <span className="mx-1.5 text-muted-foreground/50">•</span>
                          {entry.categoryName}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={`text-sm font-semibold ${
                        entry.isIncome ? 'text-emerald-500' : 'text-foreground'
                      }`}
                    >
                      {entry.isIncome ? '+' : ''}
                      {money(entry.amount)}
                    </p>
                    {entry.frequency !== 'monthly' && (
                      <p className="text-xs text-muted-foreground">
                        ≈{money(entry.monthlyCost, 0)}/mo
                      </p>
                    )}
                  </div>
                  <RowMenu
                    entry={entry}
                    open={menuOpenId === entry.merchantKey}
                    onToggle={() =>
                      setMenuOpenId(menuOpenId === entry.merchantKey ? null : entry.merchantKey)
                    }
                    onEdit={() => {
                      setMenuOpenId(null);
                      setEditing(entry);
                    }}
                    onDelete={() => remove(entry)}
                  />
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-5">
        {/* Review queue */}
        {reviewItem && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Is this recurring?
              </p>
              <p className="text-[11px] font-medium text-muted-foreground">
                {reviewQueue.length} to review
              </p>
            </div>
            <div className="p-4">
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-3 mb-4">
                  <MerchantAvatar entry={reviewItem} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {reviewItem.merchant}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {FREQUENCY_LABELS[reviewItem.frequency]}
                      <span className="mx-1.5 text-muted-foreground/50">•</span>
                      {dueLabel(reviewItem.nextDate)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-foreground flex-shrink-0">
                    {money(reviewItem.amount)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => review(reviewItem, 'dismissed')}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-red-500/40 text-red-500 text-sm font-medium hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                  >
                    No
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => review(reviewItem, 'confirmed')}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-muted text-foreground text-sm font-medium hover:bg-muted/70 disabled:opacity-50 transition-colors"
                  >
                    Yes
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
                {reviewQueue.length > 1 && (
                  <button
                    onClick={() => setReviewIndex((i) => (i + 1) % reviewQueue.length)}
                    className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip for now
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upcoming */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Upcoming this month
            </p>
          </div>
          {upcoming.length > 0 ? (
            <div className="divide-y divide-border">
              {upcoming.map((occ, i) => (
                <div key={`${occ.entry.merchantKey}-${i}`} className="flex items-center gap-3 px-5 py-3">
                  <MerchantAvatar entry={occ.entry} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {occ.entry.merchant}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {FREQUENCY_LABELS[occ.entry.frequency]}
                      <span className="mx-1.5 text-muted-foreground/50">•</span>
                      <span className={dueLabel(occ.date).startsWith('Due in') ? 'text-amber-500' : ''}>
                        {dueLabel(occ.date)}
                      </span>
                    </p>
                  </div>
                  <p
                    className={`text-sm font-semibold flex-shrink-0 ${
                      occ.entry.isIncome ? 'text-emerald-500' : 'text-foreground'
                    }`}
                  >
                    {occ.entry.isIncome ? '+' : ''}
                    {money(occ.entry.amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground px-5 py-8 text-center">
              Nothing else due this month.
            </p>
          )}
        </div>

        {/* Totals */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5">
              Monthly outflow
            </p>
            <p className="text-2xl font-bold text-foreground">{money(monthlyOutflow, 0)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {bills.length} recurring {bills.length === 1 ? 'bill' : 'bills'}, annual charges
              pro-rated
            </p>
          </div>
          <div className="pt-4 border-t border-border">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5">
              Monthly income
            </p>
            <p className="text-2xl font-bold text-emerald-500">+{money(monthlyInflow, 0)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {income.length > 0
                ? `${income.length} recurring ${income.length === 1 ? 'source' : 'sources'}`
                : 'No recurring deposits detected'}
            </p>
          </div>
        </div>
      </div>

      {selectedDate && (
        <DayDetailModal
          date={selectedDate}
          occurrences={selectedDayOccurrences}
          busy={busy}
          onClose={() => setSelectedDate(null)}
          onDismiss={async (entry) => {
            const removed = await remove(entry);
            if (!removed) return;
            // Removing the last occurrence for the day closes the modal instead
            // of leaving an empty panel open.
            setSelectedDate((prev) =>
              prev && selectedDayOccurrences.length <= 1 ? null : prev
            );
          }}
        />
      )}

      {(addOpen || editing) && (
        <RecurringFormModal
          entry={editing}
          categories={categories}
          onClose={() => {
            setAddOpen(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setAddOpen(false);
            setEditing(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function RowMenu({
  entry,
  open,
  onToggle,
  onEdit,
  onDelete,
}: {
  entry: RecurringEntry;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={onToggle}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={onToggle} />
          <div className="absolute right-0 top-9 z-20 w-44 bg-popover border border-border rounded-xl shadow-xl overflow-hidden py-1">
            {entry.isManual && (
              <button
                onClick={onEdit}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left"
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                Edit
              </button>
            )}
            <button
              onClick={onDelete}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-muted transition-colors text-left"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Shown when a calendar day cell is clicked — lists every recurring charge
// landing on that date and lets the user dismiss any that shouldn't actually
// be treated as recurring.
function DayDetailModal({
  date,
  occurrences,
  busy,
  onClose,
  onDismiss,
}: {
  date: string;
  occurrences: { entry: RecurringEntry; date: string }[];
  busy: boolean;
  onClose: () => void;
  onDismiss: (entry: RecurringEntry) => void;
}) {
  const label = parseDay(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const total = occurrences.reduce(
    (sum, o) => sum + (o.entry.isIncome ? o.entry.amount : -o.entry.amount),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{label}</h2>
            <p className="text-xs text-muted-foreground">
              {occurrences.length} recurring {occurrences.length === 1 ? 'charge' : 'charges'}
              <span className="mx-1.5 text-muted-foreground/50">•</span>
              <span className={total >= 0 ? 'text-emerald-500' : ''}>
                net {total >= 0 ? '+' : ''}
                {money(total)}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            title="Close"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-border">
          {occurrences.map((occ, i) => (
            <div key={`${occ.entry.merchantKey}-${i}`} className="flex items-center gap-3 px-5 py-3.5">
              <MerchantAvatar entry={occ.entry} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{occ.entry.merchant}</p>
                <p className="text-xs text-muted-foreground">
                  {FREQUENCY_LABELS[occ.entry.frequency]}
                  {occ.entry.categoryName && (
                    <>
                      <span className="mx-1.5 text-muted-foreground/50">•</span>
                      {occ.entry.categoryName}
                    </>
                  )}
                </p>
              </div>
              <p
                className={`text-sm font-semibold flex-shrink-0 ${
                  occ.entry.isIncome ? 'text-emerald-500' : 'text-foreground'
                }`}
              >
                {occ.entry.isIncome ? '+' : ''}
                {money(occ.entry.amount)}
              </p>
              <button
                onClick={() => onDismiss(occ.entry)}
                disabled={busy}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 flex-shrink-0"
                title="Not actually recurring — remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RecurringFormModal({
  entry,
  categories,
  onClose,
  onSaved,
}: {
  entry: RecurringEntry | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [merchantName, setMerchantName] = useState(entry?.merchant || '');
  const [frequency, setFrequency] = useState<Frequency>(entry?.frequency || 'monthly');
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '');
  const [categoryId, setCategoryId] = useState(entry?.categoryId || '');
  const [nextDate, setNextDate] = useState(
    entry?.nextDate || new Date().toISOString().slice(0, 10)
  );
  const [isIncome, setIsIncome] = useState(entry?.isIncome ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEscapeKey(onClose);

  const handleSave = async () => {
    if (!merchantName.trim()) return setError('Enter a merchant name');
    const parsed = parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return setError('Enter an amount above zero');

    setSaving(true);
    setError('');
    try {
      const payload = {
        merchantName: merchantName.trim(),
        frequency,
        amount: parsed,
        categoryId: categoryId || null,
        nextDate,
        isIncome,
      };
      const res = entry?.id
        ? await fetch(`/api/recurring/${entry.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/recurring', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (res.ok) {
        onSaved();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">
            {entry ? 'Edit recurring' : 'Add recurring'}
          </h2>
          <button
            onClick={onClose}
            title="Close"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Merchant</label>
            <input
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="Netflix"
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="15.99"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm cursor-pointer"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {FREQUENCY_LABELS[f]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Next date</label>
              <input
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm cursor-pointer"
              >
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsIncome(false)}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                !isIncome
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setIsIncome(true)}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                isIncome
                  ? 'border-emerald-500 bg-emerald-500/10 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              Income
            </button>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : entry ? 'Save changes' : 'Add recurring'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
