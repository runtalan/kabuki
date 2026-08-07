import { AppLayout } from '@/components/app-layout';
import { PageTabs, INVEST_TABS } from '@/components/page-tabs';
import { AlpacaHoldingsView } from '@/components/invest/alpaca-holdings-view';
import { getUser } from '@/lib/auth';
import { getPositions, getPortfolioSummary } from '@/lib/alpaca-trade';
import type { Position, PortfolioSummary } from '@/lib/alpaca-trade';

export const dynamic = 'force-dynamic';

export default async function InvestPage() {
  const user = await getUser();

  let positions: Position[] = [];
  let portfolioSummary: PortfolioSummary = {
    totalPortfolioValue: 0,
    totalCash: 0,
    buyingPower: 0,
    dailyPl: 0,
    dailyPlpc: 0,
  };
  let error: string | null = null;

  if (user && !user.isDemo) {
    try {
      const errorMsg = `Fetching for user: ${user.id}`;
      console.log(errorMsg);
      [positions, portfolioSummary] = await Promise.all([getPositions(user.id), getPortfolioSummary(user.id)]);
      console.log('Successfully fetched Alpaca data:', { positions, portfolioSummary });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Failed to fetch Alpaca data:', errorMessage, err);
      error = errorMessage;
    }
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Invest - Paper Trading</h1>
        </div>
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-100 border border-red-300 text-red-800">
            <p className="font-semibold">Error loading portfolio data:</p>
            <p className="text-sm">{error}</p>
            <p className="text-xs mt-2 text-red-700">Check browser console for more details</p>
          </div>
        )}
        <PageTabs tabs={INVEST_TABS} />
        <AlpacaHoldingsView positions={positions} portfolioSummary={portfolioSummary} />
      </div>
    </AppLayout>
  );
}
