import { getUser } from '@/lib/auth';
import {
  getSpendingByCategory,
  getCashFlowData,
  getUserAccounts,
  getRecentTransactions,
} from '@/lib/queries';
import { getNetWorthSeries } from '@/lib/net-worth';
import { mockSpendingByCategory, mockCashFlowData, mockNetWorthTrend, mockAccounts, mockRecentTransactions } from '@/lib/mock-data';

export async function getDashboardData() {
  try {
    const user = await getUser();
    if (!user) {
      // Return mock data if not authenticated (shouldn't happen with proxy)
      return {
        spendingByCategory: mockSpendingByCategory,
        cashFlowData: mockCashFlowData,
        netWorthTrend: mockNetWorthTrend,
        accounts: mockAccounts,
        recentTransactions: mockRecentTransactions,
      };
    }

    const [spendingByCategory, cashFlowData, netWorthSeries, userAccounts, recentTransactions] =
      await Promise.all([
        getSpendingByCategory(user.id),
        getCashFlowData(user.id),
        getNetWorthSeries(user.id, '3m'),
        getUserAccounts(user.id),
        getRecentTransactions(user.id, 5),
      ]);

    // Real data only — empty states render honestly instead of mock fallbacks
    return {
      spendingByCategory,
      cashFlowData,
      netWorthTrend: netWorthSeries.length > 0
        ? netWorthSeries.map((p) => ({ month: p.date, netWorth: p.netWorth }))
        : [],
      accounts: userAccounts.map(acc => ({
        id: acc.id,
        name: acc.displayName || acc.name,
        type: acc.type,
        balance: Number(acc.currentBalance),
        currency: acc.currency,
        kind: acc.kind as 'asset' | 'liability',
        owner: acc.owner,
        icon: acc.icon,
        mask: acc.mask,
      })),
      recentTransactions,
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // Return mock data on error
    return {
      spendingByCategory: mockSpendingByCategory,
      cashFlowData: mockCashFlowData,
      netWorthTrend: mockNetWorthTrend,
      accounts: mockAccounts,
      recentTransactions: mockRecentTransactions,
    };
  }
}

export async function getReportsData() {
  try {
    const user = await getUser();
    if (!user) {
      return {
        spendingByCategory: mockSpendingByCategory,
        cashFlowData: mockCashFlowData,
        netWorthTrend: mockNetWorthTrend,
      };
    }

    const [spendingByCategory, cashFlowData, netWorthSeries] = await Promise.all([
      getSpendingByCategory(user.id),
      getCashFlowData(user.id),
      getNetWorthSeries(user.id, '6m'),
    ]);

    return {
      spendingByCategory: spendingByCategory.length > 0 ? spendingByCategory : mockSpendingByCategory,
      cashFlowData: cashFlowData.length > 0 ? cashFlowData : mockCashFlowData,
      netWorthTrend: netWorthSeries.length > 0
        ? netWorthSeries.map((p) => ({ month: p.date, netWorth: p.netWorth }))
        : mockNetWorthTrend,
    };
  } catch (error) {
    console.error('Error fetching reports data:', error);
    return {
      spendingByCategory: mockSpendingByCategory,
      cashFlowData: mockCashFlowData,
      netWorthTrend: mockNetWorthTrend,
    };
  }
}
