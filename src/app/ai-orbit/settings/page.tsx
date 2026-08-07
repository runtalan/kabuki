'use client';

import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { PageTabs, AI_ORBIT_TABS } from '@/components/page-tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

function maskKey(key: string) {
  if (key.length <= 8) return '•'.repeat(key.length);
  return `${key.slice(0, 4)}${'•'.repeat(key.length - 8)}${key.slice(-4)}`;
}

export default function LaunchControlPage() {
  const [apiKey] = useState('sk-orbit-8f2a9c11d4e6b0f3a7c5e9d2');
  const [showKey, setShowKey] = useState(false);
  const [autoDeploy, setAutoDeploy] = useState(true);
  const [confirmEstop, setConfirmEstop] = useState(false);
  const [estopped, setEstopped] = useState(false);

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">AI Orbit — Launch Control</h1>
        </div>
        <PageTabs tabs={AI_ORBIT_TABS} />

        <div className="max-w-2xl space-y-6 mt-2">
          <Card className="p-6">
            <h2 className="text-base font-semibold text-foreground mb-1">Broker API Credentials</h2>
            <p className="text-sm text-muted-foreground mb-4">Used by AI Orbit agents to submit orders on your behalf.</p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="api-key" className="mb-1.5 block">
                  API Key
                </Label>
                <div className="flex gap-2">
                  <Input id="api-key" readOnly value={showKey ? apiKey : maskKey(apiKey)} className="font-mono" />
                  <Button variant="outline" onClick={() => setShowKey((v) => !v)}>
                    {showKey ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Auto-deploy new agents</p>
                  <p className="text-xs text-muted-foreground">Skip manual approval when launching from Strategy Lab.</p>
                </div>
                <Switch checked={autoDeploy} onCheckedChange={setAutoDeploy} />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-[#FF5000]/30">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-[#FF5000]/10 text-[#FF5000] flex items-center justify-center shrink-0">
                <TriangleAlert className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Emergency Stop</h2>
                <p className="text-sm text-muted-foreground">
                  Immediately pauses every agent in the fleet and cancels all open orders. This cannot be undone automatically.
                </p>
              </div>
            </div>

            {estopped ? (
              <div className="rounded-lg bg-[#FF5000]/10 text-[#FF5000] text-sm font-medium px-4 py-3">
                All agents have been stopped. Resume individually from Fleet Command when ready.
              </div>
            ) : (
              <>
                <label className="flex items-center gap-2 text-sm text-foreground mb-3">
                  <input
                    type="checkbox"
                    checked={confirmEstop}
                    onChange={(e) => setConfirmEstop(e.target.checked)}
                    className="accent-[#FF5000]"
                  />
                  I understand this will halt all fleet activity immediately.
                </label>
                <Button
                  disabled={!confirmEstop}
                  onClick={() => setEstopped(true)}
                  className="bg-[#FF5000]/10 text-[#FF5000] border border-[#FF5000]/30 hover:bg-[#FF5000]/20 shadow-none"
                >
                  Trigger Emergency E-Stop
                </Button>
              </>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
