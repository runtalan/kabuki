import { Sidebar } from './sidebar';
import { DevLog } from './dev-log';
import { DemoReadonlyBanner } from './demo-readonly-banner';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        <DemoReadonlyBanner />
        <div className="bg-background min-h-screen">
          {children}
        </div>
      </main>
      <DevLog />
    </div>
  );
}
