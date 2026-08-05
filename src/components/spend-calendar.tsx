'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { OWNERS } from './owner-badge';

interface Transaction {
  id: string;
  name: string;
  amount: string;
  type: 'debit' | 'credit';
  date: string;
  account?: { owner?: string | null } | null;
}

type Granularity = 'month' | 'week';

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Heat map coloring: green for net-positive days (more money in than out),
// red for net-negative days, shade intensity scaled by magnitude relative to
// the month's largest swing in either direction.
const NEUTRAL_CLASSES = 'bg-muted/40 text-muted-foreground';
const GREEN_CLASSES = [
  '',
  'bg-emerald-500/15 text-foreground',
  'bg-emerald-500/35 text-foreground',
  'bg-emerald-500/60 text-white',
  'bg-emerald-500 text-white',
];
const RED_CLASSES = [
  '',
  'bg-red-500/15 text-foreground',
  'bg-red-500/35 text-foreground',
  'bg-red-500/60 text-white',
  'bg-red-500 text-white',
];

function heatClasses(net: number, maxMagnitude: number) {
  if (net === 0 || maxMagnitude <= 0) return NEUTRAL_CLASSES;
  const ratio = Math.abs(net) / maxMagnitude;
  const level = ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1;
  return (net > 0 ? GREEN_CLASSES : RED_CLASSES)[level];
}

export function SpendCalendar({ bare = false }: { bare?: boolean } = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => new Date());
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [weekOffset, setWeekOffset] = useState(0); // which 7-day chunk within the month, week view only
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/transactions')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const txs: Transaction[] = data?.transactions || [];
        setTransactions(txs);

        // If there's no activity in the current real-world month, jump to
        // the month of the most recent transaction instead of showing an
        // empty grid the user has to manually navigate away from.
        const now = new Date();
        const hasCurrentMonthData = txs.some((tx) => {
          const d = new Date(tx.date);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        });
        if (!hasCurrentMonthData && txs.length > 0) {
          const mostRecent = txs.reduce((latest, tx) => {
            const d = new Date(tx.date);
            return d > latest ? d : latest;
          }, new Date(0));
          setCursor(new Date(mostRecent.getFullYear(), mostRecent.getMonth(), 1));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const totalDays = daysInMonth(year, month);
  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long' });

  const filtered = useMemo(
    () =>
      transactions.filter(
        (tx) => ownerFilter === 'all' || (tx.account?.owner || 'joint') === ownerFilter
      ),
    [transactions, ownerFilter]
  );

  // Spend-only totals — drives the "Spent in {month}" headline number.
  const dailyTotals = useMemo(() => {
    const map = new Map<number, number>();
    for (const tx of filtered) {
      if (tx.type !== 'debit') continue;
      const d = new Date(tx.date);
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      const day = d.getDate();
      map.set(day, (map.get(day) || 0) + Math.abs(parseFloat(tx.amount)));
    }
    return map;
  }, [filtered, year, month]);

  // Net totals (income minus spend) — drives the heat map coloring.
  const dailyNet = useMemo(() => {
    const map = new Map<number, number>();
    for (const tx of filtered) {
      const d = new Date(tx.date);
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      const day = d.getDate();
      map.set(day, (map.get(day) || 0) + parseFloat(tx.amount));
    }
    return map;
  }, [filtered, year, month]);

  const monthTotal = useMemo(
    () => Array.from(dailyTotals.values()).reduce((sum, v) => sum + v, 0),
    [dailyTotals]
  );

  const maxNetMagnitude = useMemo(
    () => Math.max(0, ...Array.from(dailyNet.values()).map((v) => Math.abs(v))),
    [dailyNet]
  );

  const allDays = Array.from({ length: totalDays }, (_, i) => i + 1);
  const weeks: number[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  const visibleWeeks = granularity === 'week' ? [weeks[Math.min(weekOffset, weeks.length - 1)] || []] : weeks;

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const changeMonth = (delta: number) => {
    setCursor(new Date(year, month + delta, 1));
    setWeekOffset(0);
    setSelectedDay(null);
  };

  const dayTransactions = (day: number) =>
    filtered.filter((tx) => {
      const d = new Date(tx.date);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

  return (
    <div className={bare ? '' : 'bg-card border border-border rounded-xl p-6'}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-1">
          <button
            onClick={() => changeMonth(-1)}
            className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Spent in {monthLabel}
          </p>
          <button
            onClick={() => changeMonth(1)}
            className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex p-0.5 rounded-lg bg-muted border border-border text-xs">
            {(['month', 'week'] as Granularity[]).map((g) => (
              <button
                key={g}
                onClick={() => {
                  setGranularity(g);
                  setWeekOffset(0);
                }}
                className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors ${
                  granularity === g
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg border border-border bg-card text-foreground"
          >
            <option value="all">Everyone</option>
            <option value="renato">{OWNERS.renato.emoji} Renato</option>
            <option value="claudia">{OWNERS.claudia.emoji} Claudia</option>
            <option value="joint">{OWNERS.joint.emoji} Joint</option>
          </select>
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      <p className={`font-bold text-foreground ${bare ? 'text-xl mb-3' : 'text-3xl mb-5'}`}>
        {loading ? '—' : formatCurrency(monthTotal)}
      </p>

      {/* Week navigator, week view only */}
      {granularity === 'week' && (
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
            disabled={weekOffset === 0}
            className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-xs text-muted-foreground">
            Days {visibleWeeks[0]?.[0]}–{visibleWeeks[0]?.[visibleWeeks[0].length - 1]}
          </p>
          <button
            onClick={() => setWeekOffset((w) => Math.min(weeks.length - 1, w + 1))}
            disabled={weekOffset >= weeks.length - 1}
            className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors text-muted-foreground"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Calendar grid */}
      <div className={bare ? 'space-y-1' : 'space-y-2'}>
        {visibleWeeks.map((week, wi) => (
          <div key={wi} className={`grid grid-cols-7 ${bare ? 'gap-1' : 'gap-2'}`}>
            {week.map((day) => {
              const net = dailyNet.get(day) || 0;
              const hasData = dailyNet.has(day);
              const isToday = isCurrentMonth && today.getDate() === day;
              const isSelected = selectedDay === day;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`aspect-square rounded-lg ${bare ? 'p-1' : 'p-2'} text-left transition-all ${heatClasses(net, maxNetMagnitude)} ${
                    isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''
                  } ${isSelected ? 'ring-2 ring-accent ring-offset-2 ring-offset-card' : ''} hover:opacity-90`}
                >
                  <p className="text-[10px] font-semibold leading-none mb-0.5">{day}</p>
                  {!bare && (
                    <p className="text-[10px] leading-none opacity-90">
                      {hasData ? `${net >= 0 ? '+' : '-'}${formatCurrency(Math.abs(net))}` : '–'}
                    </p>
                  )}
                </button>
              );
            })}
            {/* pad the final week row to keep a consistent 7-col grid */}
            {granularity === 'month' &&
              week.length < 7 &&
              Array.from({ length: 7 - week.length }).map((_, i) => <div key={`pad-${i}`} />)}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Spent
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Made
        </span>
        <span className="text-muted-foreground/60">· darker = bigger swing</span>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="mt-5 pt-4 border-t border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {monthLabel} {selectedDay}
          </p>
          <div className="space-y-2">
            {dayTransactions(selectedDay).length > 0 ? (
              dayTransactions(selectedDay).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground truncate pr-4">{tx.name}</span>
                  <span
                    className={`font-medium whitespace-nowrap ${
                      tx.type === 'credit' ? 'text-emerald-500' : 'text-foreground'
                    }`}
                  >
                    {tx.type === 'credit' ? '+' : '-'}
                    {formatCurrency(Math.abs(parseFloat(tx.amount)))}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No transactions this day</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
