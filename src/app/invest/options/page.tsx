import { AppLayout } from '@/components/app-layout';
import { PageTabs, INVEST_TABS } from '@/components/page-tabs';
import { OptionsExplorationPage } from '@/components/invest/options/options-exploration-page';
import { getUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function OptionsPage({
  searchParams,
}: {
  searchParams: { ticker?: string };
}) {
  const user = await getUser();
  if (!user) {
    return (
      <AppLayout>
        <div className="p-4 text-center">Please log in.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <PageTabs tabs={INVEST_TABS} />
        <div className="mt-8">
          <OptionsExplorationPage initialTicker={searchParams.ticker} />
        </div>
      </div>
    </AppLayout>
  );
}
