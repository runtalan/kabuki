import { AppLayout } from '@/components/app-layout';
import { PageTabs, INVEST_TABS } from '@/components/page-tabs';
import { HoldingsView } from '@/components/invest/holdings-view';
import { getUser } from '@/lib/auth';
import { getAllHoldings, getAllocation } from '@/lib/holdings';

export const dynamic = 'force-dynamic';

export default async function InvestPage() {
  const user = await getUser();

  const [holdings, allocation] =
    user && !user.isDemo ? await Promise.all([getAllHoldings(), getAllocation()]) : [[], []];

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Invest</h1>
        </div>
        <PageTabs tabs={INVEST_TABS} />
        <HoldingsView holdings={holdings} allocation={allocation} />
      </div>
    </AppLayout>
  );
}
