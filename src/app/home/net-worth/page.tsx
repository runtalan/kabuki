import { AppLayout } from '@/components/app-layout';
import { PageTabs, HOME_TABS } from '@/components/page-tabs';
import { NetWorthView } from '@/components/home/net-worth-view';
import { getUser } from '@/lib/auth';
import { getUserAccounts } from '@/lib/queries';
import { getNetWorthSeries } from '@/lib/net-worth';

export const dynamic = 'force-dynamic';

export default async function NetWorthPage() {
  const user = await getUser();

  const [series, userAccounts] = user
    ? await Promise.all([getNetWorthSeries(user.id, 'all'), getUserAccounts(user.id)])
    : [[], []];

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">Home</h1>
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
