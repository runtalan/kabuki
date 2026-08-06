import { AppLayout } from '@/components/app-layout';
import { PageTabs, PROPERTIES_TABS } from '@/components/page-tabs';
import { LoanCalculatorView } from '@/components/properties/loan-calculator-view';

export default function LoanCalculatorPage() {
  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Loan Calculator</h1>
        </div>
        <PageTabs tabs={PROPERTIES_TABS} />
        <LoanCalculatorView />
      </div>
    </AppLayout>
  );
}
