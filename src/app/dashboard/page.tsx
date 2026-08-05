import { AppLayout } from '@/components/app-layout';
import { DashboardContent } from '@/components/dashboard-content';
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

  // Calculate stats from real data — liabilities subtract, assets add
  const totalNetWorth = accounts.reduce(
    (sum, acc) => sum + (acc.kind === 'liability' ? -acc.balance : acc.balance),
    0
  );
  const currentMonthData = cashFlowData[cashFlowData.length - 1] || { income: 0, expenses: 0, savings: 0 };
  const netWorth = `$${totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const monthlyIncome = `$${currentMonthData.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const monthlyExpenses = `$${currentMonthData.expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const savingsRate = currentMonthData.income > 0
    ? `${((currentMonthData.savings / currentMonthData.income) * 100).toFixed(1)}%`
    : '0%';

  return (
    <AppLayout>
      <DashboardContent
        spendingByCategory={spendingByCategory}
        cashFlowData={cashFlowData}
        netWorthTrend={netWorthTrend}
        accounts={accounts}
        recentTransactions={recentTransactions}
        stats={{
          netWorth,
          monthlyIncome,
          monthlyExpenses,
          savingsRate,
        }}
      />
    </AppLayout>
  );
}
