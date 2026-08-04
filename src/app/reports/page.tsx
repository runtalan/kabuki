'use client';

import { useState } from 'react';
import { Calendar, Filter } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { SpendingBarChart } from '@/components/charts/spending-bar-chart';
import { CashFlowChart } from '@/components/charts/cash-flow-chart';
import { NetWorthChart } from '@/components/charts/net-worth-chart';
import { mockSpendingByCategory, mockCashFlowData, mockNetWorthTrend } from '@/lib/mock-data';

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('this-month');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const spendingByCategory = mockSpendingByCategory;
  const cashFlowData = mockCashFlowData;
  const netWorthTrend = mockNetWorthTrend;

  const totalSpending = spendingByCategory.reduce((sum, cat) => sum + cat.value, 0);
  const currentMonth = cashFlowData[cashFlowData.length - 1];
  const savingsRate = currentMonth && currentMonth.income > 0
    ? ((currentMonth.savings / currentMonth.income) * 100).toFixed(1)
    : '0';

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Reports & Analytics</h1>
            <p className="text-muted-foreground">Comprehensive financial analysis and insights</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              title="Select date range"
            >
              <Calendar className="w-4 h-4" />
              <span className="text-sm">{dateRange === 'this-month' ? 'This Month' : 'Custom Range'}</span>
            </button>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              title="Apply filters"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filter</span>
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Total Spending</p>
            <p className="text-2xl font-bold text-foreground">${totalSpending.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-2">This month</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Average Daily Spend</p>
            <p className="text-2xl font-bold text-foreground">${(totalSpending / 30).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-2">Estimated</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Savings Rate</p>
            <p className="text-2xl font-bold text-green-600">{savingsRate}%</p>
            <p className="text-xs text-muted-foreground mt-2">Of income saved</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Budget Status</p>
            <p className="text-2xl font-bold text-primary">On Track</p>
            <p className="text-xs text-muted-foreground mt-2">Under budget</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          {/* Spending by Category */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Spending by Category</h2>
            <SpendingBarChart data={spendingByCategory} />
          </div>

          {/* Category Breakdown Table */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Category Breakdown</h2>
            <div className="space-y-3">
              {spendingByCategory.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    ></div>
                    <span className="text-sm font-medium text-foreground">{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">${cat.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {((cat.value / totalSpending) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cash Flow Analysis */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Income & Expense Trends</h2>
          <CashFlowChart data={cashFlowData} />
        </div>

        {/* Net Worth Progression */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Net Worth Progression</h2>
          <NetWorthChart data={netWorthTrend} />
        </div>
      </div>
    </AppLayout>
  );
}
