import { AppLayout } from '@/components/app-layout';
import { PageTabs, SPENDING_TABS } from '@/components/page-tabs';
import { RecurringView } from '@/components/spending/recurring-view';
import { getUser } from '@/lib/auth';
import { getRecurringItems } from '@/lib/spending-insights';

export const dynamic = 'force-dynamic';

export default async function RecurringPage() {
  const user = await getUser();
  const items = user ? await getRecurringItems(user.id) : [];

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">Spending</h1>
        <PageTabs tabs={SPENDING_TABS} />
        <RecurringView items={items} />
      </div>
    </AppLayout>
  );
}
