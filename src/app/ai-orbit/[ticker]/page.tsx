import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { Card } from '@/components/ui/card';
import { PhaseBadge } from '@/components/ai-orbit/phase-badge';
import { StatusBadge } from '@/components/ai-orbit/status-badge';
import { StrategyTuner } from '@/components/ai-orbit/strategy-tuner';
import { MOCK_AGENTS } from '@/lib/mock-ai-orbit';

function formatCurrency(value: number) {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function AgentDetailPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const agent = MOCK_AGENTS.find((a) => a.ticker.toLowerCase() === ticker.toLowerCase());

  if (!agent) notFound();

  const adjustedBasis = agent.rawStockBasis - agent.totalCapturedPremiums;

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <Link
          href="/ai-orbit"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Fleet Command
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">{agent.ticker}</h1>
              <PhaseBadge phase={agent.phase} />
              <StatusBadge status={agent.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">{agent.companyName}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <Card className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Captured Premium</p>
            <p className="text-2xl font-bold text-[#00C805]">{formatCurrency(agent.capturedPremium)}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Position P&amp;L</p>
            <p className={`text-2xl font-bold ${agent.positionPl >= 0 ? 'text-[#00C805]' : 'text-[#FF5000]'}`}>
              {formatCurrency(agent.positionPl)}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Shares Held</p>
            <p className="text-2xl font-bold text-foreground">{agent.sharesHeld}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-6">
            <h3 className="text-base font-semibold text-foreground mb-4">Premium-Adjusted Cost Basis</h3>
            {agent.rawStockBasis > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Raw Stock Basis</span>
                  <span className="font-medium text-foreground">{formatCurrency(agent.rawStockBasis)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Captured Premiums</span>
                  <span className="font-medium text-[#00C805]">-{formatCurrency(agent.totalCapturedPremiums)}</span>
                </div>
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Adjusted Basis</span>
                  <span className="text-lg font-bold text-foreground">{formatCurrency(adjustedBasis)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No shares currently held — agent is in the cash-secured put phase.</p>
            )}

            {agent.position && (
              <div className="mt-6 pt-5 border-t border-border">
                <h4 className="text-sm font-semibold text-foreground mb-3">Open Position</h4>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Contracts</span>
                  <span className="text-right font-medium text-foreground">{agent.position.contracts}</span>
                  <span className="text-muted-foreground">Strike</span>
                  <span className="text-right font-medium text-foreground">${agent.position.strike}</span>
                  <span className="text-muted-foreground">Expiration</span>
                  <span className="text-right font-medium text-foreground">{agent.position.expiration}</span>
                  <span className="text-muted-foreground">DTE</span>
                  <span className="text-right font-medium text-foreground">{agent.position.dte}d</span>
                  <span className="text-muted-foreground">Underlying Price</span>
                  <span className="text-right font-medium text-foreground">${agent.position.underlyingPrice}</span>
                </div>
              </div>
            )}
          </Card>

          <StrategyTuner agent={agent} />
        </div>
      </div>
    </AppLayout>
  );
}
