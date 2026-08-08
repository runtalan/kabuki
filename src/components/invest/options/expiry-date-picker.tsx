'use client';

import { useEffect, useRef, useState } from 'react';

interface ExpiryOption {
  expiry: string; // YYYY-MM-DD
  daysToExpiry: number;
}

interface ExpiryDatePickerProps {
  value: string | null;
  options: ExpiryOption[];
  onChange: (expiry: string) => void;
}

function parseDateOnly(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function ExpiryDatePicker({ value, options, onChange }: ExpiryDatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const optionByExpiry = new Map(options.map((o) => [o.expiry, o]));
  const selected = value ? parseDateOnly(value) : null;
  const [viewYear, setViewYear] = useState(() => (selected ?? new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (selected ?? new Date()).getMonth());

  useEffect(() => {
    if (!selected) return;
    setViewYear(selected.getFullYear());
    setViewMonth(selected.getMonth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const availableMonthKeys = new Set(
    options.map((o) => {
      const d = parseDateOnly(o.expiry);
      return `${d.getFullYear()}-${d.getMonth()}`;
    })
  );
  const sortedMonthKeys = Array.from(availableMonthKeys).sort();
  const currentMonthKey = `${viewYear}-${viewMonth}`;
  const currentMonthKeyIndex = sortedMonthKeys.indexOf(currentMonthKey);
  const canGoPrevMonth = sortedMonthKeys.some((k) => k < currentMonthKey);
  const canGoNextMonth = sortedMonthKeys.some((k) => k > currentMonthKey);

  const goToAdjacentAvailableMonth = (direction: 1 | -1) => {
    const candidates = direction === 1
      ? sortedMonthKeys.filter((k) => k > currentMonthKey)
      : sortedMonthKeys.filter((k) => k < currentMonthKey).reverse();
    const next = candidates[0];
    if (!next) return;
    const [y, m] = next.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m);
  };

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();
  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = firstOfMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const selectedOption = value ? optionByExpiry.get(value) : undefined;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm hover:border-blue-400 dark:hover:border-blue-500 transition shadow-sm"
      >
        <span className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-blue-500 dark:text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {value ? (
            <span className="font-semibold">
              {parseDateOnly(value).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              {selectedOption && (
                <span className="ml-1 font-normal text-gray-500 dark:text-gray-400">
                  ({selectedOption.daysToExpiry}d)
                </span>
              )}
            </span>
          ) : (
            <span className="text-gray-400">Select expiration</span>
          )}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-72 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              disabled={!canGoPrevMonth}
              onClick={() => goToAdjacentAvailableMonth(-1)}
              className={`p-1 rounded transition ${
                canGoPrevMonth
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              }`}
              aria-label="Previous month"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{monthLabel}</div>
            <button
              type="button"
              disabled={!canGoNextMonth}
              onClick={() => goToAdjacentAvailableMonth(1)}
              className={`p-1 rounded transition ${
                canGoNextMonth
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              }`}
              aria-label="Next month"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div
                key={i}
                className="text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 py-1"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;
              const dateKey = toDateKey(viewYear, viewMonth, day);
              const option = optionByExpiry.get(dateKey);
              const isAvailable = Boolean(option);
              const isSelected = dateKey === value;

              return (
                <button
                  key={dateKey}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => {
                    onChange(dateKey);
                    setOpen(false);
                  }}
                  title={option ? `${option.daysToExpiry}d to expiry` : undefined}
                  className={`
                    aspect-square rounded-lg text-xs font-semibold transition flex items-center justify-center
                    ${
                      isSelected
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md'
                        : isAvailable
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                          : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-[10px] text-gray-400 dark:text-gray-500">
            Highlighted dates have listed expirations
          </div>
        </div>
      )}
    </div>
  );
}
