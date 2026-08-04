import { Sidebar } from './sidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-64">
        <div className="bg-background min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
