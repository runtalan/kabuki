'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatNumber } from '@/lib/format';
import { ChartTooltip } from './chart-tooltip';
import { EmptyChartState } from './empty-chart-state';
import { CategoryIcon } from '../category-icon';

interface SpendingData {
  name: string;
  value: number;
  color: string;
  icon?: string | null;
}

// Custom Y-axis label: category icon + name, right-aligned against the bars.
function CategoryTick({ x, y, payload, items }: any) {
  const item: SpendingData | undefined = items.find((d: SpendingData) => d.name === payload.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-150} y={-11} width={144} height={22}>
        <div className="flex items-center justify-end gap-1.5 h-full">
          <CategoryIcon icon={item?.icon} className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-xs text-foreground truncate">{payload.value}</span>
        </div>
      </foreignObject>
    </g>
  );
}

export function SpendingBarChart({ data }: { data: SpendingData[] }) {
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <div className="w-full h-80">
        <EmptyChartState message="No spending recorded for this period" height={320} />
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.value - a.value);
  const chartHeight = Math.max(240, sorted.length * 44);

  return (
    <div className="w-full" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 8, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
            tickFormatter={(value) => `$${formatNumber(value)}`}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tickLine={false}
            axisLine={false}
            tick={(props) => <CategoryTick {...props} items={sorted} />}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
            content={<ChartTooltip />}
          />
          <Bar dataKey="value" name="Spending" radius={[0, 6, 6, 0]} barSize={22}>
            {sorted.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
