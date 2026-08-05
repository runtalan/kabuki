import { AppLayout } from '@/components/app-layout';
import { PageTabs, HOME_TABS } from '@/components/page-tabs';
import { CashFlowView } from '@/components/home/cash-flow-view';
import { getUser } from '@/lib/auth';
import { getCurrentMonthTransactions, getCashFlowSeries } from '@/lib/queries';
import { db } from '@/db';

export const dynamic = 'force-dynamic';

export default async function CashFlowPage() {
  const user = await getUser();

  const [monthTransactions, categories, series] = user
    ? await Promise.all([
        getCurrentMonthTransactions(user.id),
        db.query.categories.findMany(),
        getCashFlowSeries(user.id),
      ])
    : [[], [], []];

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">Home</h1>
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
