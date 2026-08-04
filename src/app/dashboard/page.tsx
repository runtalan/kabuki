import { TrendingUp, TrendingDown, Wallet, CreditCard } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { SpendingPieChart } from '@/components/charts/spending-pie-chart';
import { CashFlowChart } from '@/components/charts/cash-flow-chart';
import { NetWorthChart } from '@/components/charts/net-worth-chart';
import { getDashboardData } from '@/components/dashboard-data';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const {
    spendingByCategory,
    cashFlowData,
    netWorthTrend,
    accounts,
    recentTransactions,
  } = await getDashboardData();

  // Calculate stats from real data
  const totalNetWorth = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const currentMonthData = cashFlowData[cashFlowData.length - 1] || { income: 0, expenses: 0, savings: 0 };
  const netWorth = `$${totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const monthlyIncome = `$${currentMonthData.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const monthlyExpenses = `$${currentMonthData.expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const savingsRate = currentMonthData.income > 0
    ? `${((currentMonthData.savings / currentMonthData.income) * 100).toFixed(1)}%`
    : '0%';

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your financial overview.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Net Worth Card */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Net Worth</p>
                <p className="text-2xl font-bold text-foreground">{netWorth}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span>+2.4% from last month</span>
            </div>
          </div>

          {/* Monthly Income Card */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Monthly Income</p>
                <p className="text-2xl font-bold text-foreground">{monthlyIncome}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">From all sources</p>
          </div>

          {/* Monthly Expenses Card */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Monthly Expenses</p>
                <p className="text-2xl font-bold text-foreground">{monthlyExpenses}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Total spend this month</p>
          </div>

          {/* Savings Rate Card */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Savings Rate</p>
                <p className="text-2xl font-bold text-foreground">{savingsRate}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Of income saved</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          {/* Spending by Category */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Spending by Category</h2>
            <SpendingPieChart data={spendingByCategory} />
          </div>

          {/* Cash Flow Trend */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Cash Flow Trend</h2>
            <CashFlowChart data={cashFlowData} />
          </div>

          {/* Net Worth Trend */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Net Worth Trend</h2>
            <NetWorthChart data={netWorthTrend} />
          </div>
        </div>

        {/* Accounts & Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Accounts */}
          <div className="lg:col-span-1 bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Linked Accounts</h2>
            <div className="space-y-3">
              {accounts.length > 0 ? (
                accounts.map((account) => (
                  <div
                    key={account.id}
                    className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground text-sm">{account.name}</span>
                      <span className="text-xs text-muted-foreground">{account.type}</span>
                    </div>
                    <p className="text-lg font-semibold text-primary">
                      ${Math.abs(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No accounts linked yet</p>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Recent Transactions</h2>
            <div className="space-y-3">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded border border-border hover:bg-muted/20 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{tx.name}</p>
                    <p className="text-xs text-muted-foreground">{tx.category}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold text-sm ${
                        tx.amount >= 0 ? 'text-green-600' : 'text-foreground'
                      }`}
                    >
                      {tx.amount >= 0 ? '+' : ''} ${Math.abs(tx.amount).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))
              ) : (
                <p className="text-sm text-muted-foreground">No transactions yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
