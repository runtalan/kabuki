import { AppLayout } from '@/components/app-layout';
import { PageTabs, SPENDING_TABS } from '@/components/page-tabs';
import { RecurringView } from '@/components/spending/recurring-view';
import { getUser } from '@/lib/auth';
import { getRecurringEntries } from '@/lib/recurring';
import { db } from '@/db';

export const dynamic = 'force-dynamic';

export default async function RecurringPage() {
  const user = await getUser();

  const [entries, categories] = user
    ? await Promise.all([
        getRecurringEntries(user.id),
        db.query.categories.findMany({ orderBy: (cat, { asc }) => asc(cat.name) }),
      ])
    : [[], []];

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">Spending</h1>
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
