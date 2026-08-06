import { AppLayout } from '@/components/app-layout';
import { PageTabs, HOME_TABS } from '@/components/page-tabs';
import { CashFlowView } from '@/components/home/cash-flow-view';
import { OwnerToggle } from '@/components/owner-toggle';
import { getUser } from '@/lib/auth';
import { getCurrentMonthTransactions, getCashFlowSeries } from '@/lib/queries';
import { parseOwnerFilter } from '@/lib/owner-filter';
import { db } from '@/db';

export const dynamic = 'force-dynamic';

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string }>;
}) {
  const user = await getUser();
  const ownerFilter = parseOwnerFilter((await searchParams).owner);

  const [monthTransactions, categories, series] = user
    ? await Promise.all([
        getCurrentMonthTransactions(user.id, ownerFilter),
        db.query.categories.findMany(),
        getCashFlowSeries(user.id, 24, ownerFilter),
      ])
    : [[], [], []];

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Home</h1>
          <OwnerToggle value={ownerFilter} />
        </div>
        <PageTabs tabs={HOME_TABS} />
        <CashFlowView
          transactions={monthTransactions.map((tx) => ({
            ...tx,
            date: tx.date.toISOString(),
            tags: tx.tags.map((t) => t.tag),
          }))}
          categories={categories}
          series={series}
        />
      </div>
    </AppLayout>
  );
}
