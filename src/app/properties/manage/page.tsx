import { AppLayout } from '@/components/app-layout';
import { PageTabs, PROPERTIES_TABS } from '@/components/page-tabs';
import { ManagePropertiesView } from '@/components/properties/manage-properties-view';
import { getUser } from '@/lib/auth';
import { getAllProperties } from '@/lib/properties';

export const dynamic = 'force-dynamic';

export default async function ManagePropertiesPage() {
  const user = await getUser();

  const properties = user && !user.isDemo ? await getAllProperties() : [];

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">Manage Properties</h1>
        </div>
        <PageTabs tabs={PROPERTIES_TABS} />
        <ManagePropertiesView properties={properties} />
      </div>
    </AppLayout>
  );
}
