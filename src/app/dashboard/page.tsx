import { TrendingUp, TrendingDown, Wallet, CreditCard, ArrowUpRight, ArrowDownLeft, Eye, MoreVertical } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { SpendingBarChart } from '@/components/charts/spending-bar-chart';
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Net Worth Card */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 shadow-lg text-white hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs font-semibold text-blue-100 uppercase tracking-wide mb-2">Net Worth</p>
                <p className="text-3xl font-bold">{netWorth}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/20 backdrop-blur">
                <Wallet className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-100 font-medium">
              <TrendingUp className="w-4 h-4" />
              <span>+2.4% from last month</span>
            </div>
          </div>

          {/* Monthly Income Card */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-6 shadow-lg text-white hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wide mb-2">Monthly Income</p>
                <p className="text-3xl font-bold">{monthlyIncome}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/20 backdrop-blur">
                <ArrowDownLeft className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-emerald-100 font-medium">From all sources</p>
          </div>

          {/* Monthly Expenses Card */}
          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-6 shadow-lg text-white hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs font-semibold text-red-100 uppercase tracking-wide mb-2">Monthly Expenses</p>
                <p className="text-3xl font-bold">{monthlyExpenses}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/20 backdrop-blur">
                <ArrowUpRight className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-red-100 font-medium">Total spend this month</p>
          </div>

          {/* Savings Rate Card */}
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 shadow-lg text-white hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs font-semibold text-purple-100 uppercase tracking-wide mb-2">Savings Rate</p>
                <p className="text-3xl font-bold">{savingsRate}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/20 backdrop-blur">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-purple-100 font-medium">Of income saved</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          {/* Spending by Category */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Spending by Category</h2>
              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <SpendingBarChart data={spendingByCategory} />
          </div>

          {/* Cash Flow Trend */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Cash Flow Trend</h2>
              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <CashFlowChart data={cashFlowData} />
          </div>

          {/* Net Worth Trend */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Net Worth Trend</h2>
              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <NetWorthChart data={netWorthTrend} />
          </div>
        </div>

        {/* Accounts & Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Accounts */}
          <div className="lg:col-span-1 bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Linked Accounts</h2>
              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              {accounts.length > 0 ? (
                accounts.map((account) => (
                  <div
                    key={account.id}
                    className="p-4 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-border hover:border-primary/50 hover:from-muted/80 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <CreditCard className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium text-foreground text-sm">{account.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                        {account.type}
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-primary ml-9">
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
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Recent Transactions</h2>
              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-2">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/40 transition-all duration-200 border border-transparent hover:border-border"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2.5 rounded-lg ${tx.amount >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {tx.amount >= 0 ? (
                        <ArrowDownLeft className={`w-5 h-5 ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                      ) : (
                        <ArrowUpRight className={`w-5 h-5 ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">{tx.name}</p>
                      <p className="text-xs text-muted-foreground">{tx.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold text-sm ${
                        tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
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
