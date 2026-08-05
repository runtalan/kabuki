'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { formatNumber } from '@/lib/format';
import { ChartTooltip } from './chart-tooltip';
import { EmptyChartState } from './empty-chart-state';

interface SpendingData {
  name: string;
  value: number;
  color: string;
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

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="name"
            tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
            tickFormatter={(value) => `$${formatNumber(value)}`}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
            content={<ChartTooltip />}
          />
          <Legend />
          <Bar dataKey="value" fill="#8884d8" name="Spending" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
