import { AppLayout } from '@/components/app-layout';
import { PageTabs, HOME_TABS } from '@/components/page-tabs';
import { HomeOverview } from '@/components/home/home-overview';
import { getUser } from '@/lib/auth';
import { getCashFlowData, getRecentTransactions, getUserAccounts } from '@/lib/queries';
import { getNetWorthSeries } from '@/lib/net-worth';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getUser();

  const [netWorthSeries, cashFlowData, userAccounts, recentTransactions] = user
    ? await Promise.all([
        getNetWorthSeries(user.id, '3m'),
        getCashFlowData(user.id),
        getUserAccounts(user.id),
        getRecentTransactions(user.id, 8),
      ])
    : [[], [], [], []];

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">Home</h1>
        <PageTabs tabs={HOME_TABS} />
        <HomeOverview
          netWorthSeries={netWorthSeries}
          cashFlowData={cashFlowData}
          accounts={userAccounts.map((acc) => ({
            id: acc.id,
            name: acc.displayName || acc.name,
            type: acc.type,
            subtype: acc.subtype,
            balance: Number(acc.currentBalance),
            kind: (acc.kind as 'asset' | 'liability') || 'asset',
            owner: acc.owner || undefined,
            icon: acc.icon,
            mask: acc.mask,
            liabilityType: acc.liabilityType,
            assetType: acc.assetType,
          }))}
          recentTransactions={recentTransactions.map((tx) => ({
            ...tx,
            date: tx.date.toISOString(),
          }))}
        />
      </div>
    </AppLayout>
  );
}
