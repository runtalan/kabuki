'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AppLayout } from '@/components/app-layout';

// Prediction data
const PREDICTIONS = [
  { date: 'Today', AAPL: 228.5, MSFT: 428.9, TSLA: 245.3, NVDA: 875.2 },
  { date: 'Wk +1', AAPL: 232, MSFT: 435, TSLA: 242, NVDA: 880 },
  { date: 'Wk +2', AAPL: 235, MSFT: 440, TSLA: 240, NVDA: 885 },
  { date: 'Wk +4', AAPL: 238, MSFT: 445, TSLA: 248, NVDA: 892 },
  { date: 'Mo +1', AAPL: 245, MSFT: 455, TSLA: 255, NVDA: 905 },
  { date: 'Mo +2', AAPL: 252, MSFT: 465, TSLA: 262, NVDA: 920 },
];

const PREDICTIONS_TABLE = [
  { symbol: 'AAPL', current: '$228.50', week1: '$232.00', month1: '$245.00', confidence: '75%', trend: '📈 Bullish' },
  { symbol: 'MSFT', current: '$428.90', week1: '$435.00', month1: '$455.00', confidence: '82%', trend: '📈 Bullish' },
  { symbol: 'TSLA', current: '$245.30', week1: '$242.00', month1: '$255.00', confidence: '62%', trend: '📊 Mixed' },
  { symbol: 'NVDA', current: '$875.20', week1: '$880.00', month1: '$905.00', confidence: '78%', trend: '📈 Bullish' },
  { symbol: 'SPY', current: '$480.15', week1: '$485.00', month1: '$495.00', confidence: '71%', trend: '📈 Bullish' },
];

export default function PredictionsPage() {
  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Predictions</h1>
        <p className="text-muted-foreground mb-8">AI-powered price predictions and market analysis</p>

        {/* Disclaimer */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 mb-8">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            ⚠️ <strong>Disclaimer:</strong> These predictions are based on historical data and machine learning models. They are not guaranteed and should not be used as the sole basis for investment decisions. Always conduct your own research.
          </p>
        </div>

        {/* Model Accuracy */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-lg border border-border p-4 bg-card">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">1-Week Accuracy</p>
            <p className="text-3xl font-bold text-foreground">78.3%</p>
            <p className="text-xs text-emerald-600 mt-1">+2.1% vs last month</p>
          </div>
          <div className="rounded-lg border border-border p-4 bg-card">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">1-Month Accuracy</p>
            <p className="text-3xl font-bold text-foreground">72.1%</p>
            <p className="text-xs text-emerald-600 mt-1">+1.8% vs last month</p>
          </div>
          <div className="rounded-lg border border-border p-4 bg-card">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Best Performer</p>
            <p className="text-3xl font-bold text-foreground">MSFT</p>
            <p className="text-xs text-muted-foreground mt-1">85.2% accuracy</p>
          </div>
        </div>

        {/* Price Prediction Chart */}
        <div className="rounded-lg border border-border p-6 bg-card mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Price Predictions - AAPL vs MSFT</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={PREDICTIONS}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(107, 114, 128, 0.1)" />
                <XAxis dataKey="date" stroke="rgba(107, 114, 128, 0.5)" />
                <YAxis stroke="rgba(107, 114, 128, 0.5)" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#f3f4f6' }}
                  formatter={(value) => `$${(value as number).toFixed(2)}`}
                />
                <Line type="monotone" dataKey="AAPL" stroke="#3b82f6" name="AAPL" strokeWidth={2} />
                <Line type="monotone" dataKey="MSFT" stroke="#8b5cf6" name="MSFT" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Predictions Table */}
        <div className="rounded-lg border border-border overflow-hidden bg-card mb-8">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-foreground text-xs">Symbol</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Current</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">1-Week Target</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">1-Month Target</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground text-xs">Confidence</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground text-xs">Trend</th>
              </tr>
            </thead>
            <tbody>
              {PREDICTIONS_TABLE.map((pred, i) => (
                <tr key={i} className="border-b border-border hover:bg-muted/20 cursor-pointer transition-colors last:border-0">
                  <td className="px-4 py-3 font-bold text-foreground">{pred.symbol}</td>
                  <td className="px-4 py-3 text-right text-foreground">{pred.current}</td>
                  <td className="px-4 py-3 text-right text-foreground">{pred.week1}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">{pred.month1}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                      {pred.confidence}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{pred.trend}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Market Sentiment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border border-border p-6 bg-card">
            <h3 className="font-semibold text-foreground mb-4">Market Sentiment</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <p className="text-sm text-foreground">Overall Market</p>
                  <p className="text-sm font-semibold text-emerald-600">Bullish 72%</p>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '72%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <p className="text-sm text-foreground">Tech Sector</p>
                  <p className="text-sm font-semibold text-emerald-600">Bullish 78%</p>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '78%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <p className="text-sm text-foreground">Semiconductors</p>
                  <p className="text-sm font-semibold text-emerald-600">Very Bullish 85%</p>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '85%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border p-6 bg-card">
            <h3 className="font-semibold text-foreground mb-4">Risk Factors</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="font-medium text-foreground">Interest Rate Risk</p>
                  <p className="text-xs text-muted-foreground">Fed decision expected 09/18</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">📊</span>
                <div>
                  <p className="font-medium text-foreground">Earnings Season</p>
                  <p className="text-xs text-muted-foreground">Q2 earnings ending 08/15</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">🌍</span>
                <div>
                  <p className="font-medium text-foreground">Geopolitical Events</p>
                  <p className="text-xs text-muted-foreground">Monitor trade tensions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
