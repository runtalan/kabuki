'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { PhaseBadge } from './phase-badge';
import { StatusBadge } from './status-badge';
import type { Agent } from '@/types/ai-orbit';

function formatCurrency(value: number) {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AgentCard({ agent }: { agent: Agent }) {
  const [active, setActive] = useState(agent.status !== 'PAUSED');
  const plColor = agent.positionPl >= 0 ? 'text-[#00C805]' : 'text-[#FF5000]';

  return (
    <Card className="p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/ai-orbit/${agent.ticker}`} className="min-w-0">
          <p className="text-lg font-bold text-foreground tracking-tight">{agent.ticker}</p>
          <p className="text-sm text-muted-foreground truncate">{agent.companyName}</p>
        </Link>
        <Switch
          checked={active}
          onCheckedChange={setActive}
          disabled={agent.status === 'ERROR'}
          aria-label={active ? `Pause ${agent.ticker} agent` : `Resume ${agent.ticker} agent`}
        />
      </div>

      <div className="flex items-center gap-2 mt-3">
        <PhaseBadge phase={agent.phase} />
        <StatusBadge status={agent.status === 'PAUSED' && active ? 'ACTIVE' : agent.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Captured Premium</p>
          <p className="text-base font-semibold text-[#00C805]">{formatCurrency(agent.capturedPremium)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Position P&amp;L</p>
          <p className={`text-base font-semibold ${plColor}`}>{formatCurrency(agent.positionPl)}</p>
        </div>
      </div>
    </Card>
  );
}
