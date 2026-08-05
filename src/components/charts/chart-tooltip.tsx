'use client';

import { formatCurrency } from '@/lib/format';

interface TooltipPayloadEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  titlePrefix?: string;
}

// Dark, information-dense hover card — mirrors the Monarch-style tooltip:
// bold contextual title, one row per series with a colored dot + value.
export function ChartTooltip({ active, payload, label, titlePrefix = '' }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="min-w-[200px] rounded-xl bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 shadow-2xl px-4 py-3">
      <p className="text-xs font-semibold text-zinc-100 mb-2">
        {titlePrefix}
        {label}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-6 text-xs">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-semibold text-zinc-100 tabular-nums">
              {entry.value === undefined || entry.value === null
                ? '—'
                : formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
