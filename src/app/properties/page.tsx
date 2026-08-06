import { AppLayout } from '@/components/app-layout';
import { PageTabs, PROPERTIES_TABS } from '@/components/page-tabs';
import { PropertiesOverview } from '@/components/properties/properties-overview';
import { getUser } from '@/lib/auth';
import { getAllProperties, getCombinedEquitySeries } from '@/lib/properties';

export const dynamic = 'force-dynamic';

export default async function PropertiesPage() {
  const user = await getUser();

  const [properties, equitySeries] =
    user && !user.isDemo
      ? await Promise.all([getAllProperties(), getCombinedEquitySeries(6)])
      : [[], []];

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Properties</h1>
        </div>
        <PageTabs tabs={PROPERTIES_TABS} />
        <PropertiesOverview properties={properties} equitySeries={equitySeries} />
      </div>
    </AppLayout>
  );
}
