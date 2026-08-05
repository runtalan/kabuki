'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatNumber } from '@/lib/format';
import { ChartTooltip } from './chart-tooltip';
import { EmptyChartState } from './empty-chart-state';

interface NetWorthData {
  month: string;
  netWorth: number;
}

export function NetWorthChart({ data }: { data: NetWorthData[] }) {
  if (data.length < 2) {
    return (
      <div className="w-full h-80">
        <EmptyChartState message="Not enough history yet — check back after a sync or two" height={320} />
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(value) => `$${formatNumber(value)}`}
          />
          <Tooltip
            cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '4 4' }}
            content={<ChartTooltip />}
          />
          <Area
            type="monotone"
            dataKey="netWorth"
            name="Net Worth"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#colorNetWorth)"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
