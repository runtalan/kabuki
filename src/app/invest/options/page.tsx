import { AppLayout } from '@/components/app-layout';
import { PageTabs, INVEST_TABS } from '@/components/page-tabs';
import { OptionsPortfolioView } from '@/components/invest/options-portfolio-view';
import { getUser } from '@/lib/auth';
import { getAllHoldings } from '@/lib/holdings';

export const dynamic = 'force-dynamic';

export default async function OptionsPage() {
  const user = await getUser();
  const allHoldings = user && !user.isDemo ? await getAllHoldings() : [];

  // Filter to only options holdings (assetClass would need to be tracked for options)
  // For now, show all holdings and add options-specific UI later
  const optionsHoldings = allHoldings.filter((h) => h.assetClass === 'option');

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Options</h1>
        <p className="text-muted-foreground mb-4">Manage your options positions and derivatives strategies</p>
        <PageTabs tabs={INVEST_TABS} />

        {optionsHoldings.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            <p>No options positions yet. Visit Trade Stocks to start selling covered calls or cash-secured puts.</p>
          </div>
        ) : (
          <OptionsPortfolioView holdings={optionsHoldings} />
        )}
      </div>
    </AppLayout>
  );
}
