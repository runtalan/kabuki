import { AppLayout } from '@/components/app-layout';
import { PageTabs, AI_ORBIT_TABS } from '@/components/page-tabs';
import { FlightLogFeed } from '@/components/ai-orbit/flight-log-feed';
import { MOCK_LOGS } from '@/lib/mock-ai-orbit';

export default function FlightLogsPage() {
  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">AI Orbit — Flight Logs</h1>
        </div>
        <PageTabs tabs={AI_ORBIT_TABS} />
        <p className="text-sm text-muted-foreground mb-4">
          Live execution feed for every agent in the fleet — order submissions, fills, rejections, and scheduled cron polls.
        </p>
        <FlightLogFeed logs={MOCK_LOGS} />
      </div>
    </AppLayout>
  );
}
