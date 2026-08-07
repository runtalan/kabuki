import { AppLayout } from '@/components/app-layout';
import { PageTabs, INVEST_TABS } from '@/components/page-tabs';
import { OptionsExplorationPage } from '@/components/invest/options/options-exploration-page';
import { getUser } from '@/lib/auth';
import { generateMockHoldings, generateMockOptionContracts } from '@/lib/mock-options-data';

export const dynamic = 'force-dynamic';

export default async function OptionsPage() {
  const user = await getUser();

  const mockHoldings = generateMockHoldings();
  const allMockContracts = mockHoldings.flatMap((holding) =>
    generateMockOptionContracts(holding.ticker)
  );

  const currentPriceMap = mockHoldings.reduce(
    (map, holding) => {
      map[holding.ticker] = holding.currentPrice;
      return map;
    },
    {} as Record<string, number>
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <PageTabs tabs={INVEST_TABS} />
        <div className="mt-8">
          <OptionsExplorationPage
            holdings={mockHoldings}
            availableContracts={allMockContracts}
            currentPriceMap={currentPriceMap}
          />
        </div>
      </div>
    </AppLayout>
  );
}
