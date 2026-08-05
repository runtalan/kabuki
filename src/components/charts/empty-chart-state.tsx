'use client';

import { BarChart3 } from 'lucide-react';

interface EmptyChartStateProps {
  message?: string;
  height?: number;
}

// Consistent placeholder for every chart when there's no data (or the data
// is all zero) — avoids Recharts rendering a broken/blank axis grid.
export function EmptyChartState({
  message = 'No data for this period yet',
  height = 320,
}: EmptyChartStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 text-muted-foreground"
      style={{ height }}
    >
      <BarChart3 className="w-8 h-8 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
