import { AppLayout } from '@/components/app-layout';
import { PageTabs, HOME_TABS } from '@/components/page-tabs';
import { HomeOverview } from '@/components/home/home-overview';
import { OwnerToggle } from '@/components/owner-toggle';
import { getUser } from '@/lib/auth';
import { getCashFlowData, getRecentTransactions, getUserAccounts } from '@/lib/queries';
import { getNetWorthSeries } from '@/lib/net-worth';
import { parseOwnerFilter } from '@/lib/owner-filter';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string }>;
}) {
  const user = await getUser();
  const ownerFilter = parseOwnerFilter((await searchParams).owner);

  const [netWorthSeries, cashFlowData, userAccounts, recentTransactions] = user
    ? await Promise.all([
        getNetWorthSeries(user.id, '3m', ownerFilter),
        getCashFlowData(user.id, ownerFilter),
        getUserAccounts(user.id, ownerFilter),
        getRecentTransactions(user.id, 8, ownerFilter),
      ])
    : [[], [], [], []];

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Home</h1>
          <OwnerToggle value={ownerFilter} />
        </div>
        <PageTabs tabs={HOME_TABS} />
        <HomeOverview
          netWorthSeries={netWorthSeries}
          cashFlowData={cashFlowData}
          ownerFilter={ownerFilter}
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
