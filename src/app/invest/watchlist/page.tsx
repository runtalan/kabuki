import { AppLayout } from '@/components/app-layout';
import { PageTabs, INVEST_TABS } from '@/components/page-tabs';
import { WatchlistManagerWrapper } from '@/components/invest/watchlist/watchlist-manager-wrapper';
import { AddTickerForm } from '@/components/invest/watchlist/add-ticker-form';
import { getUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function WatchlistPage() {
  const user = await getUser();

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <PageTabs tabs={INVEST_TABS} />
        <div className="mt-8 space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-white">
              Watch List
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-300">
              Track your favorite stocks and monitor their daily performance
            </p>
          </div>

          <section className="space-y-6">
            <AddTickerForm />

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">
                Your Tracked Tickers
              </h2>
              <WatchlistManagerWrapper />
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
