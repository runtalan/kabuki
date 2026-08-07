import { AppLayout } from '@/components/app-layout';
import { PageTabs, AI_ORBIT_TABS } from '@/components/page-tabs';
import { AgentCard } from '@/components/ai-orbit/agent-card';
import { MOCK_AGENTS, TOTAL_PREMIUM_CAPTURED } from '@/lib/mock-ai-orbit';

export default function AiOrbitPage() {
  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">AI Orbit — Fleet Command</h1>
        </div>
        <PageTabs tabs={AI_ORBIT_TABS} />

        <div className="mb-8">
          <p className="text-sm font-medium text-muted-foreground mb-1">Total Premium Captured</p>
          <p className="text-5xl font-bold text-[#00C805] tracking-tight">
            ${TOTAL_PREMIUM_CAPTURED.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Agent Roster</h2>
          <span className="text-sm text-muted-foreground">{MOCK_AGENTS.length} agents deployed</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {MOCK_AGENTS.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
