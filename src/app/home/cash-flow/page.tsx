import { AppLayout } from '@/components/app-layout';
import { PageTabs, HOME_TABS } from '@/components/page-tabs';
import { CashFlowView } from '@/components/home/cash-flow-view';
import { OwnerToggle } from '@/components/owner-toggle';
import { MonthToggle } from '@/components/spending/month-toggle';
import { getUser } from '@/lib/auth';
import { getMonthTransactions, getCashFlowSeries } from '@/lib/queries';
import { parseOwnerFilter } from '@/lib/owner-filter';
import { parseMonthParam } from '@/lib/date';
import { db } from '@/db';

export const dynamic = 'force-dynamic';

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string; month?: string }>;
}) {
  const user = await getUser();
  const { owner, month } = await searchParams;
  const ownerFilter = parseOwnerFilter(owner);
  const refDate = parseMonthParam(month);

  const [monthTransactions, categories, series] = user
    ? await Promise.all([
        getMonthTransactions(user.id, refDate, ownerFilter),
        db.query.categories.findMany(),
        getCashFlowSeries(user.id, 24, ownerFilter),
      ])
    : [[], [], []];

  const now = new Date();
  const isCurrentMonth =
    refDate.getFullYear() === now.getFullYear() && refDate.getMonth() === now.getMonth();

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Home</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <OwnerToggle value={ownerFilter} owners={user?.household.usernames} />
            <MonthToggle refDate={refDate.toISOString()} isCurrentMonth={isCurrentMonth} />
          </div>
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
          refDate={refDate.toISOString()}
        />
      </div>
    </AppLayout>
  );
}
