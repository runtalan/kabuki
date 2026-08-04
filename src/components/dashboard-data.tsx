import { getUser } from '@/lib/auth';
import {
  getSpendingByCategory,
  getCashFlowData,
  getNetWorthTrend,
  getUserAccounts,
  getRecentTransactions,
} from '@/lib/queries';
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

    const [spendingByCategory, cashFlowData, netWorthTrend, userAccounts, recentTransactions] =
      await Promise.all([
        getSpendingByCategory(user.id),
        getCashFlowData(user.id),
        getNetWorthTrend(user.id),
        getUserAccounts(user.id),
        getRecentTransactions(user.id, 5),
      ]);

    // Fallback to mock data if queries return empty
    return {
      spendingByCategory: spendingByCategory.length > 0 ? spendingByCategory : mockSpendingByCategory,
      cashFlowData: cashFlowData.length > 0 ? cashFlowData : mockCashFlowData,
      netWorthTrend: netWorthTrend.length > 0 ? netWorthTrend : mockNetWorthTrend,
      accounts: userAccounts.length > 0 ? userAccounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        balance: Number(acc.currentBalance),
        currency: acc.currency,
      })) : mockAccounts,
      recentTransactions: recentTransactions.length > 0 ? recentTransactions : mockRecentTransactions,
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

    const [spendingByCategory, cashFlowData, netWorthTrend] = await Promise.all([
      getSpendingByCategory(user.id),
      getCashFlowData(user.id),
      getNetWorthTrend(user.id),
    ]);

    return {
      spendingByCategory: spendingByCategory.length > 0 ? spendingByCategory : mockSpendingByCategory,
      cashFlowData: cashFlowData.length > 0 ? cashFlowData : mockCashFlowData,
      netWorthTrend: netWorthTrend.length > 0 ? netWorthTrend : mockNetWorthTrend,
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
