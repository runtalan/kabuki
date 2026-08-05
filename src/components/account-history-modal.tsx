'use client';

import { useEffect, useState } from 'react';
import { X, Loader } from 'lucide-react';
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
import { ChartTooltip } from './charts/chart-tooltip';

interface HistoryPoint {
  balance: string;
  recordedAt: string;
}

interface AccountHistoryModalProps {
  accountId: string;
  onClose: () => void;
}

export function AccountHistoryModal({ accountId, onClose }: AccountHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [accountName, setAccountName] = useState('');
  const [kind, setKind] = useState<'asset' | 'liability'>('asset');
  const [points, setPoints] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    fetch(`/api/accounts/${accountId}/history`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setAccountName(data.account?.name || 'Account');
          setKind(data.account?.kind || 'asset');
          setPoints(data.history || []);
        }
      })
      .finally(() => setLoading(false));
  }, [accountId]);

  const chartData = points.map((p) => ({
    date: new Date(p.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    balance: Number(p.balance),
  }));

  const latest = chartData[chartData.length - 1]?.balance ?? 0;
  const earliest = chartData[0]?.balance ?? 0;
  const delta = latest - earliest;
  const deltaPct = earliest !== 0 ? (delta / Math.abs(earliest)) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-foreground">{accountName}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Balance history</p>

        {loading ? (
          <div className="h-64 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading history...</span>
          </div>
        ) : chartData.length < 2 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground text-center">
            <p className="text-sm">Not enough history yet</p>
            <p className="text-xs">
              Each sync (or manual balance edit) adds a snapshot — check back after a
              refresh or two.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-3 mb-4">
              <p
                className={`text-3xl font-bold ${
                  kind === 'liability' ? 'text-red-500' : 'text-foreground'
                }`}
              >
                {kind === 'liability' ? '-' : ''}$
                {Math.abs(latest).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <span
                className={`text-sm font-medium ${
                  (kind === 'liability' ? -delta : delta) >= 0 ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {delta >= 0 ? '+' : ''}
                {delta.toLocaleString('en-US', { maximumFractionDigits: 0 })} (
                {deltaPct >= 0 ? '+' : ''}
                {deltaPct.toFixed(1)}%)
              </span>
            </div>

            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="historyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={kind === 'liability' ? '#ef4444' : '#3b82f6'}
                        stopOpacity={0.7}
                      />
                      <stop
                        offset="95%"
                        stopColor={kind === 'liability' ? '#ef4444' : '#3b82f6'}
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(v) => `$${formatNumber(v)}`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    name="Balance"
                    stroke={kind === 'liability' ? '#ef4444' : '#3b82f6'}
                    fill="url(#historyGradient)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
