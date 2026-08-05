'use client';

import { useState } from 'react';
import { AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AppLayout } from '@/components/app-layout';

// Chart data
const PORTFOLIO_CHART_DATA = [
  { date: 'Jan 1', value: 245000 },
  { date: 'Jan 15', value: 252000 },
  { date: 'Feb 1', value: 248000 },
  { date: 'Feb 15', value: 261000 },
  { date: 'Mar 1', value: 275000 },
  { date: 'Mar 15', value: 268000 },
  { date: 'Apr 1', value: 272000 },
  { date: 'Apr 15', value: 281000 },
  { date: 'May 1', value: 285430 },
];

const HOLDING_CHARTS: Record<string, Array<{ value: number }>> = {
  AAPL: [
    { value: 220 }, { value: 222 }, { value: 225 }, { value: 224 }, { value: 226 },
    { value: 228 }, { value: 227 }, { value: 229 }, { value: 228 }, { value: 228.5 },
  ],
  MSFT: [
    { value: 410 }, { value: 412 }, { value: 415 }, { value: 418 }, { value: 420 },
    { value: 422 }, { value: 424 }, { value: 426 }, { value: 428 }, { value: 428.9 },
  ],
  TSLA: [
    { value: 280 }, { value: 275 }, { value: 270 }, { value: 265 }, { value: 260 },
    { value: 255 }, { value: 250 }, { value: 248 }, { value: 246 }, { value: 245.3 },
  ],
  NVDA: [
    { value: 750 }, { value: 780 }, { value: 810 }, { value: 840 }, { value: 850 },
    { value: 860 }, { value: 870 }, { value: 875 }, { value: 875 }, { value: 875.2 },
  ],
};

const ALLOCATION_DATA = [
  { name: 'AAPL', value: 11425 },
  { name: 'MSFT', value: 15011 },
  { name: 'NVDA', value: 13128 },
  { name: 'SPY', value: 48015 },
  { name: 'Others', value: 198400 },
];

const ALLOCATION_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#6b7280'];

const HOLDINGS = [
  { symbol: 'AAPL', name: 'Apple Inc.', shares: 50, price: '$228.50', value: '$11,425', change: '+$450', pct: '+4.1%' },
  { symbol: 'MSFT', name: 'Microsoft', shares: 35, price: '$428.90', value: '$15,011', change: '+$1,240', pct: '+9.0%' },
  { symbol: 'TSLA', name: 'Tesla Inc.', shares: 20, price: '$245.30', value: '$4,906', change: '-$640', pct: '-11.5%' },
  { symbol: 'NVDA', name: 'NVIDIA', shares: 15, price: '$875.20', value: '$13,128', change: '+$2,180', pct: '+20.1%' },
  { symbol: 'SPY', name: 'S&P 500 ETF', shares: 100, price: '$480.15', value: '$48,015', change: '+$2,840', pct: '+6.3%' },
];

export default function InvestHoldingsPage() {
  const [timeRange, setTimeRange] = useState<'1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y'>('1Y');

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Invest</h1>
        <p className="text-muted-foreground mb-8">View and manage your investment portfolio</p>

        {/* Portfolio Summary */}
        <div className="rounded-lg border border-border p-6 bg-gradient-to-br from-card to-primary/5 mb-8">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Portfolio Value</p>
              <p className="text-4xl font-bold text-foreground">$285,430</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-600">+$12,340</p>
              <p className="text-sm text-emerald-600 font-semibold">+4.5%</p>
            </div>
          </div>

          {/* Time Range Buttons */}
          <div className="flex gap-2 mb-4">
            {(['1W', '1M', '3M', '6M', 'YTD', '1Y'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  timeRange === range
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Portfolio Performance Chart */}
          <div className="h-64 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={PORTFOLIO_CHART_DATA}>
                <defs>
                  <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(107, 114, 128, 0.1)" />
                <XAxis dataKey="date" stroke="rgba(107, 114, 128, 0.5)" tick={{ fontSize: 12 }} />
                <YAxis stroke="rgba(107, 114, 128, 0.5)" tick={{ fontSize: 12 }} domain={['dataMin - 5000', 'dataMax + 5000']} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#f3f4f6' }}
                  formatter={(value) => `$${(value as number).toLocaleString()}`}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#portfolioGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Holdings Grid with Sparklines */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Holdings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {HOLDINGS.map((holding) => (
              <div key={holding.symbol} className="rounded-lg border border-border p-4 bg-card hover:bg-muted/20 cursor-pointer transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">{holding.symbol}</p>
                    <p className="text-xs text-muted-foreground">{holding.name}</p>
                  </div>
                  <p className="text-xs font-semibold text-right text-foreground">{holding.shares} shares</p>
                </div>

                {/* Mini Sparkline Chart */}
                <div className="h-12 mb-3 -mx-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={HOLDING_CHARTS[holding.symbol] || []}>
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={holding.change.startsWith('+') ? '#10b981' : '#ef4444'}
                        dot={false}
                        strokeWidth={2}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-muted-foreground">{holding.price}/share</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{holding.value}</p>
                    <p className={`text-xs font-semibold ${holding.change.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>
                      {holding.change} ({holding.pct})
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio Allocation */}
        <div className="rounded-lg border border-border p-6 bg-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Portfolio Allocation</h2>
          <div className="flex gap-8">
            <div className="h-40 w-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ALLOCATION_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {ALLOCATION_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ALLOCATION_COLORS[index]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 space-y-2">
              {ALLOCATION_DATA.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ALLOCATION_COLORS[index] }} />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                  <span className="text-xs font-semibold text-foreground ml-auto">
                    ${(item.value / 1000).toFixed(1)}k
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
