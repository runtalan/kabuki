import { AppLayout } from '@/components/app-layout';
import { PageTabs, INVEST_TABS } from '@/components/page-tabs';
import { TradeStocksView } from '@/components/invest/trade-stocks-view';
import { getUser } from '@/lib/auth';
import { getPositions } from '@/lib/alpaca-trade';
import type { HoldingWithValue } from '@/lib/holdings';
import { getUserAccounts } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function TradeStocksPage() {
  const user = await getUser();
  let holdings: HoldingWithValue[] = [];
  let accountId: string | null = null;

  if (user && !user.isDemo) {
    try {
      const alpacaPositions = await getPositions(user.id);

      // Convert Alpaca positions to HoldingWithValue format
      holdings = alpacaPositions.map((pos, idx) => ({
        id: idx,
        symbol: pos.symbol,
        name: pos.symbol,
        assetClass: pos.assetClass,
        shares: pos.qty,
        costBasis: pos.costBasis,
        currentPrice: pos.currentPrice,
        currentValue: pos.marketValue,
        gainLoss: pos.unrealizedPl,
        gainLossPct: pos.unrealizedPlpc * 100,
        acquisitionDate: new Date(),
      }));
    } catch (error) {
      console.error('Failed to fetch Alpaca positions:', error);
      holdings = [];
    }

    const userAccounts = await getUserAccounts(user.id);
    const brokerageAccount = userAccounts.find((acc) => acc.type === 'brokerage');
    accountId = brokerageAccount?.id ?? null;
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Trade Stocks</h1>
        </div>
        <PageTabs tabs={INVEST_TABS} />
        <TradeStocksView holdings={holdings} accountId={accountId} />
      </div>
    </AppLayout>
  );
}
