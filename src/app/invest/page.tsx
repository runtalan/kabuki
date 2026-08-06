import { AppLayout } from '@/components/app-layout';
import { HoldingsView } from '@/components/invest/holdings-view';
import { getAllHoldings, getAllocation } from '@/lib/holdings';

export const dynamic = 'force-dynamic';

export default async function InvestPage() {
  const [holdings, allocation] = await Promise.all([getAllHoldings(), getAllocation()]);

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Invest</h1>
        </div>
        <HoldingsView holdings={holdings} allocation={allocation} />
      </div>
    </AppLayout>
  );
}
