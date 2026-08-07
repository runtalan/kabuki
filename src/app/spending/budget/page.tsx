import { AppLayout } from '@/components/app-layout';
import { PageTabs, SPENDING_TABS } from '@/components/page-tabs';
import { MonthToggle } from '@/components/spending/month-toggle';
import { BudgetView } from '@/components/spending/budget-view';
import { getUser } from '@/lib/auth';
import { getSpendingByCategory, getMonthTransactions } from '@/lib/queries';
import { getCategoryBudgetSuggestions, getMonthlyBudgetHistory } from '@/lib/spending-insights';
import { parseMonthParam, toMonthParam } from '@/lib/date';
import { db } from '@/db';

export const dynamic = 'force-dynamic';

// Budgets are a household-wide target, not per-person — no owner toggle here
// (unlike the other Spending pages), matching the Renato/Claudia/All filter
// being about "who spent this," which doesn't apply to a shared budget.
export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getUser();
  const { month } = await searchParams;
  const refDate = parseMonthParam(month);

  const [allCategories, spendingByCategory, monthTransactions, suggestions, monthlyHistory] = user
    ? await Promise.all([
        db.query.categories.findMany({
          orderBy: (cat, { asc }) => [asc(cat.order), asc(cat.name)],
        }),
        getSpendingByCategory(user.id, refDate),
        getMonthTransactions(user.id, refDate),
        getCategoryBudgetSuggestions(user.id),
        getMonthlyBudgetHistory(user.id),
      ])
    : [[], [], [], {}, []];

  const now = new Date();
  const isCurrentMonth =
    refDate.getFullYear() === now.getFullYear() && refDate.getMonth() === now.getMonth();

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Spending</h1>
          <MonthToggle refDate={refDate.toISOString()} isCurrentMonth={isCurrentMonth} />
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
          transactions={monthTransactions.map((tx) => ({
            ...tx,
            date: tx.date.toISOString(),
            tags: tx.tags.map((t) => t.tag),
          }))}
          monthLabel={refDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          isCurrentMonth={isCurrentMonth}
          monthParam={toMonthParam(refDate)}
        />
      </div>
    </AppLayout>
  );
}
