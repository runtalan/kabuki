import { AppLayout } from '@/components/app-layout';
import { PageTabs, SPENDING_TABS } from '@/components/page-tabs';
import { BudgetView } from '@/components/spending/budget-view';
import { getUser } from '@/lib/auth';
import { getSpendingByCategory } from '@/lib/queries';
import { getCategoryBudgetSuggestions } from '@/lib/spending-insights';
import { db } from '@/db';

export const dynamic = 'force-dynamic';

export default async function BudgetPage() {
  const user = await getUser();

  const [allCategories, spendingByCategory, suggestions] = user
    ? await Promise.all([
        db.query.categories.findMany({ orderBy: (cat, { asc }) => asc(cat.name) }),
        getSpendingByCategory(user.id),
        getCategoryBudgetSuggestions(user.id),
      ])
    : [[], [], {}];

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">Spending</h1>
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
        />
      </div>
    </AppLayout>
  );
}
