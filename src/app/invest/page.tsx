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

  if (user && !user.isDemo) {
    try {
      [positions, portfolioSummary] = await Promise.all([getPositions(user.id), getPortfolioSummary(user.id)]);
    } catch (error) {
      console.error('Failed to fetch Alpaca data:', error);
    }
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Invest - Paper Trading</h1>
        </div>
        <PageTabs tabs={INVEST_TABS} />
        <AlpacaHoldingsView positions={positions} portfolioSummary={portfolioSummary} />
      </div>
    </AppLayout>
  );
}
