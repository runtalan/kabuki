'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatNumber } from '@/lib/format';
import { ChartTooltip } from './chart-tooltip';
import { EmptyChartState } from './empty-chart-state';

interface CashFlowData {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

export function CashFlowChart({ data }: { data: CashFlowData[] }) {
  const hasData = data.some((d) => d.income > 0 || d.expenses > 0);

  if (!hasData) {
    return (
      <div className="w-full h-80">
        <EmptyChartState message="No income or expenses recorded for this period" height={320} />
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
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
          <Legend />
          <Line
            type="monotone"
            dataKey="income"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="expenses"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="savings"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
