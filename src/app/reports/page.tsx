'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { SpendingBarChart } from '@/components/charts/spending-bar-chart';
import { CashFlowChart } from '@/components/charts/cash-flow-chart';
import { NetWorthChart } from '@/components/charts/net-worth-chart';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Transaction {
  id: string;
  amount: string;
  type: 'debit' | 'credit';
  date: string;
  categoryId?: string;
  category?: Category;
  account?: {
    id: string;
    name: string;
    displayName?: string | null;
    owner?: string;
  };
}

const OWNER_TABS = [
  { value: 'all', label: 'Everyone', emoji: '🏠' },
  { value: 'renato', label: 'Renato', emoji: '👦' },
  { value: 'claudia', label: 'Claudia', emoji: '👧' },
  { value: 'joint', label: 'Joint', emoji: '🤝' },
];

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'renato' | 'claudia' | 'joint'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [txRes, catRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/categories'),
      ]);

      if (txRes.ok) {
        const txData = await txRes.json();
        console.log('Transactions:', txData);
        setTransactions(txData.transactions || []);
      } else {
        console.error('Failed to fetch transactions:', txRes.status);
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRangeDays = () => {
    switch (timeRange) {
      case 'week':
        return 7;
      case 'month':
        return 30;
      case 'quarter':
        return 90;
      case 'year':
        return 365;
      default:
        return 30;
    }
  };

  const getTimeRangeDate = () => {
    if (timeRange === 'custom' && customStartDate) {
      return new Date(customStartDate);
    }
    const now = new Date();
    const days = getTimeRangeDays();
    const date = new Date(now);
    date.setDate(date.getDate() - days);
    return date;
  };

  const getEndDate = () => {
    if (timeRange === 'custom' && customEndDate) {
      return new Date(customEndDate);
    }
    return new Date();
  };

  const filteredTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    const inRange = txDate >= getTimeRangeDate() && txDate <= getEndDate();
    const matchesOwner =
      ownerFilter === 'all' || (tx.account?.owner || 'joint') === ownerFilter;
    return inRange && matchesOwner;
  });

  const spendingByCategory = categories
    .map((cat) => {
      const total = filteredTransactions
        .filter((tx) => tx.categoryId === cat.id && tx.type === 'debit')
        .reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0);
      return {
        name: cat.name,
        value: total,
        color: cat.color,
      };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalSpending = spendingByCategory.reduce((sum, cat) => sum + cat.value, 0);
  const totalIncome = filteredTransactions
    .filter((tx) => tx.type === 'credit')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
  const savingsRate = totalIncome > 0 ? (((totalIncome - totalSpending) / totalIncome) * 100).toFixed(1) : '0';

  const generateCashFlowData = () => {
    const data: Record<string, { income: number; expenses: number; savings: number }> = {};
    const startDate = getTimeRangeDate();
    const endDate = getEndDate();
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!data[key]) {
        data[key] = { income: 0, expenses: 0, savings: 0 };
      }
    }

    filteredTransactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      const key = txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      if (data[key]) {
        const amount = parseFloat(tx.amount);
        if (tx.type === 'credit') {
          data[key].income += amount;
        } else {
          data[key].expenses += Math.abs(amount);
        }
        data[key].savings = data[key].income - data[key].expenses;
      }
    });

    return Object.entries(data).map(([month, values]) => ({ month, ...values }));
  };

  const generateNetWorthData = () => {
    const data: Record<string, number> = {};
    let runningTotal = 0;
    const startDate = getTimeRangeDate();
    const endDate = getEndDate();
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      data[key] = runningTotal;
    }

    const sortedTx = [...filteredTransactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedTx.forEach((tx) => {
      const txDate = new Date(tx.date);
      const key = txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      if (data.hasOwnProperty(key)) {
        // amount is already signed correctly: negative = expense, positive = income
        runningTotal += parseFloat(tx.amount);
        data[key] = runningTotal;
      }
    });

    return Object.entries(data).map(([month, netWorth]) => ({ month, netWorth }));
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-4 md:p-8">
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {ownerFilter === 'all'
                ? 'Reports & Analytics'
                : `${OWNER_TABS.find((t) => t.value === ownerFilter)?.label}'s Report`}
            </h1>
            <p className="text-muted-foreground">
              {ownerFilter === 'all'
                ? 'Track your spending trends and cash flow'
                : `Spending across accounts owned by ${
                    OWNER_TABS.find((t) => t.value === ownerFilter)?.label
                  }`}
            </p>
          </div>
        </div>

        {/* Owner Tabs — default per-person reports */}
        <div className="inline-flex p-1 rounded-xl bg-muted/60 border border-border mb-6">
          {OWNER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setOwnerFilter(tab.value as typeof ownerFilter)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                ownerFilter === tab.value
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Range Controls */}
        <div className="flex gap-3 mb-8 flex-wrap items-center">
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'quarter' | 'year' | 'custom')}
              className="px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Custom Date Range Inputs */}
          {timeRange === 'custom' && (
            <>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <span className="text-muted-foreground">to</span>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Total Spending</p>
            <p className="text-2xl font-bold text-red-600">
              ${totalSpending.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Total Income</p>
            <p className="text-2xl font-bold text-green-600">
              ${totalIncome.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Savings Rate</p>
            <p className="text-2xl font-bold text-primary">{savingsRate}%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Transactions</p>
            <p className="text-2xl font-bold text-foreground">{filteredTransactions.length}</p>
          </div>
        </div>

        {/* Charts */}
        {filteredTransactions.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 mb-8">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Spending by Category</h2>
              {spendingByCategory.length > 0 ? (
                <>
                  <SpendingBarChart data={spendingByCategory} />
                  <div className="mt-6 space-y-3">
                    {spendingByCategory.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-sm font-medium text-foreground">{cat.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">
                            ${cat.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {((cat.value / totalSpending) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  No spending data for this period
                </div>
              )}
            </div>

            {/* Cash Flow */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Income & Expense Trends</h2>
              <CashFlowChart data={generateCashFlowData()} />
            </div>

            {/* Net Worth */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Net Worth Progression</h2>
              <NetWorthChart data={generateNetWorthData()} />
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-2">No transactions found</p>
            <p className="text-sm text-muted-foreground">
              Link a bank account and make some transactions to see reports
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
