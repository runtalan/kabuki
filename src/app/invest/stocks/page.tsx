import { AppLayout } from '@/components/app-layout';
import { PageTabs, INVEST_TABS } from '@/components/page-tabs';
import { TradeStocksView } from '@/components/invest/trade-stocks-view';
import { getUser } from '@/lib/auth';
import { getAllHoldings } from '@/lib/holdings';

export const dynamic = 'force-dynamic';

export default async function TradeStocksPage() {
  const user = await getUser();
  const holdings = user && !user.isDemo ? await getAllHoldings() : [];

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Trade Stocks</h1>
        </div>
        <PageTabs tabs={INVEST_TABS} />
        <TradeStocksView holdings={holdings} />
      </div>
    </AppLayout>
  );
}
