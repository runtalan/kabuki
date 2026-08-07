'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AppLayout } from '@/components/app-layout';
import { PageTabs, AI_ORBIT_TABS } from '@/components/page-tabs';
import { Card } from '@/components/ui/card';
import { MOCK_MONTHLY_YIELD } from '@/lib/mock-ai-orbit';

const totalPut = MOCK_MONTHLY_YIELD.reduce((sum, m) => sum + m.putPremium, 0);
const totalCall = MOCK_MONTHLY_YIELD.reduce((sum, m) => sum + m.callPremium, 0);
const bestMonth = MOCK_MONTHLY_YIELD.reduce((best, m) =>
  m.putPremium + m.callPremium > best.putPremium + best.callPremium ? m : best
);

export default function YieldAnalyticsPage() {
  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">AI Orbit — Yield Analytics</h1>
        </div>
        <PageTabs tabs={AI_ORBIT_TABS} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Put Premium (YTD)</p>
            <p className="text-2xl font-bold text-[#AF52DE]">${totalPut.toLocaleString()}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Call Premium (YTD)</p>
            <p className="text-2xl font-bold text-[#FF9500]">${totalCall.toLocaleString()}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Best Month</p>
            <p className="text-2xl font-bold text-[#00C805]">{bestMonth.month}</p>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">Monthly Premium Income</h3>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={MOCK_MONTHLY_YIELD}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                formatter={(value) => `$${Number(value).toLocaleString()}`}
                contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="putPremium" name="Put Premium" stackId="a" fill="#AF52DE" radius={[0, 0, 0, 0]} />
              <Bar dataKey="callPremium" name="Call Premium" stackId="a" fill="#FF9500" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </AppLayout>
  );
}
