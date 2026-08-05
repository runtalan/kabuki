import { AppLayout } from '@/components/app-layout';
import { PageTabs, SPENDING_TABS } from '@/components/page-tabs';
import { SpendingOverview } from '@/components/spending/spending-overview';
import { MonthToggle } from '@/components/spending/month-toggle';
import { getUser } from '@/lib/auth';
import { getSpendingByCategory } from '@/lib/queries';
import { getSpendingOverview, getTopMerchants } from '@/lib/spending-insights';
import { db } from '@/db';

export const dynamic = 'force-dynamic';

// Parses a "YYYY-MM" search param into the first-of-month Date it refers to,
// falling back to the real current month for anything missing or malformed.
function parseMonthParam(value: string | undefined): Date {
  if (value) {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      if (month >= 0 && month <= 11) return new Date(year, month, 1);
    }
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default async function SpendingPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getUser();
  const { month } = await searchParams;
  const refDate = parseMonthParam(month);

  const [overview, spendingByCategory, allCategories, topMerchants] = user
    ? await Promise.all([
        getSpendingOverview(user.id, refDate),
        getSpendingByCategory(user.id, refDate),
        db.query.categories.findMany(),
        getTopMerchants(user.id, refDate),
      ])
    : [
        {
          spentThisMonth: 0,
          monthlyAverage: 0,
          daysElapsed: 1,
          daysInMonth: 30,
          velocity: [],
        },
        [],
        [],
        [],
      ];

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
        <SpendingOverview
          overview={overview}
          spendingByCategory={spendingByCategory}
          budgetCategories={allCategories.map((cat) => ({
            id: cat.id,
            name: cat.name,
            color: cat.color,
            icon: cat.icon,
            monthlyBudget: cat.monthlyBudget ? Number(cat.monthlyBudget) : null,
          }))}
          isCurrentMonth={isCurrentMonth}
          topMerchants={topMerchants}
          refDate={refDate.toISOString()}
        />
      </div>
    </AppLayout>
  );
}
