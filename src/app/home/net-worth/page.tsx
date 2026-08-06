import { AppLayout } from '@/components/app-layout';
import { PageTabs, HOME_TABS } from '@/components/page-tabs';
import { NetWorthView } from '@/components/home/net-worth-view';
import { OwnerToggle } from '@/components/owner-toggle';
import { getUser } from '@/lib/auth';
import { getUserAccounts } from '@/lib/queries';
import { getNetWorthSeries } from '@/lib/net-worth';
import { parseOwnerFilter } from '@/lib/owner-filter';

export const dynamic = 'force-dynamic';

export default async function NetWorthPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string }>;
}) {
  const user = await getUser();
  const ownerFilter = parseOwnerFilter((await searchParams).owner);

  const [series, userAccounts] = user
    ? await Promise.all([
        getNetWorthSeries(user.id, 'all', ownerFilter),
        getUserAccounts(user.id, ownerFilter),
      ])
    : [[], []];

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Home</h1>
          <OwnerToggle value={ownerFilter} />
        </div>
        <PageTabs tabs={HOME_TABS} />
        <NetWorthView
          series={series}
          accounts={userAccounts.map((acc) => ({
            id: acc.id,
            name: acc.displayName || acc.name,
            type: acc.type,
            subtype: acc.subtype,
            balance: Number(acc.currentBalance),
            kind: (acc.kind as 'asset' | 'liability') || 'asset',
            icon: acc.icon,
            mask: acc.mask,
            liabilityType: acc.liabilityType,
            assetType: acc.assetType,
          }))}
        />
      </div>
    </AppLayout>
  );
}
