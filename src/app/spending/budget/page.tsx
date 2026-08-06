import { AppLayout } from '@/components/app-layout';
import { PageTabs, SPENDING_TABS } from '@/components/page-tabs';
import { BudgetView } from '@/components/spending/budget-view';
import { OwnerToggle } from '@/components/owner-toggle';
import { getUser } from '@/lib/auth';
import { getSpendingByCategory } from '@/lib/queries';
import { getCategoryBudgetSuggestions, getMonthlyBudgetHistory } from '@/lib/spending-insights';
import { parseOwnerFilter } from '@/lib/owner-filter';
import { db } from '@/db';

export const dynamic = 'force-dynamic';

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string }>;
}) {
  const user = await getUser();
  const ownerFilter = parseOwnerFilter((await searchParams).owner);

  const [allCategories, spendingByCategory, suggestions, monthlyHistory] = user
    ? await Promise.all([
        db.query.categories.findMany({ orderBy: (cat, { asc }) => asc(cat.name) }),
        getSpendingByCategory(user.id, undefined, ownerFilter),
        getCategoryBudgetSuggestions(user.id, ownerFilter),
        getMonthlyBudgetHistory(user.id, 12, ownerFilter),
      ])
    : [[], [], {}, []];

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Spending</h1>
          <OwnerToggle value={ownerFilter} />
        </div>
        <PageTabs tabs={SPENDING_TABS} />
        <BudgetView
          categories={allCategories.map((cat) => ({
            id: cat.id,
            name: cat.name,
            color: cat.color,
            icon: cat.icon,
            monthlyBudget: cat.monthlyBudget ? Number(cat.monthlyBudget) : null,
          }))}
          spendingByCategory={spendingByCategory}
          suggestions={suggestions}
          monthlyHistory={monthlyHistory}
        />
      </div>
    </AppLayout>
  );
}
