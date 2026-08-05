'use client';

import { Eye } from 'lucide-react';
import { useIsDemo } from '@/hooks/use-is-demo';

// Shown app-wide (mounted in AppLayout) whenever the session is the shared
// public demo account — sets expectations up front rather than visitors
// discovering "view-only" by trial and error on a disabled button.
export function DemoReadonlyBanner() {
  const isDemo = useIsDemo();
  if (!isDemo) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-2 border-b border-primary/20">
      <Eye className="w-4 h-4 shrink-0" />
      <span>You&apos;re viewing the demo account — data is real-looking but fake, and everything here is view-only.</span>
    </div>
  );
}
