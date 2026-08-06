import { AppLayout } from '@/components/app-layout';
import { PageTabs, SPENDING_TABS } from '@/components/page-tabs';
import { RecurringView } from '@/components/spending/recurring-view';
import { OwnerToggle } from '@/components/owner-toggle';
import { getUser } from '@/lib/auth';
import { getRecurringEntries } from '@/lib/recurring';
import { parseOwnerFilter } from '@/lib/owner-filter';
import { db } from '@/db';

export const dynamic = 'force-dynamic';

export default async function RecurringPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string }>;
}) {
  const user = await getUser();
  const ownerFilter = parseOwnerFilter((await searchParams).owner);

  const [entries, categories] = user
    ? await Promise.all([
        getRecurringEntries(user.id, ownerFilter),
        db.query.categories.findMany({ orderBy: (cat, { asc }) => asc(cat.name) }),
      ])
    : [[], []];

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Spending</h1>
          <OwnerToggle value={ownerFilter} />
        </div>
        <PageTabs tabs={SPENDING_TABS} />
        <RecurringView
          entries={entries}
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            color: c.color,
            icon: c.icon,
          }))}
        />
      </div>
    </AppLayout>
  );
}
