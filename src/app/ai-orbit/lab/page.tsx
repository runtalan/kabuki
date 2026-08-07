'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { PageTabs, AI_ORBIT_TABS } from '@/components/page-tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RiskProfile } from '@/types/ai-orbit';

const STEPS = ['Ticker Selection', 'Risk Profile', 'Confirm Lockup'];

const RISK_OPTIONS: { value: RiskProfile; label: string; description: string }[] = [
  { value: 'CONSERVATIVE', label: 'Conservative', description: 'Lower delta, farther OTM strikes, longer DTE.' },
  { value: 'BALANCED', label: 'Balanced', description: 'Moderate delta, standard 30-45 DTE cycle.' },
  { value: 'AGGRESSIVE', label: 'Aggressive', description: 'Higher delta, closer strikes, shorter DTE.' },
];

export default function StrategyLabPage() {
  const [step, setStep] = useState(0);
  const [ticker, setTicker] = useState('');
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('BALANCED');
  const [deployed, setDeployed] = useState(false);

  const buyingPowerLockup = 20000;
  const canAdvance = step === 0 ? ticker.trim().length > 0 : true;

  function handleDeploy() {
    setDeployed(true);
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-3xl font-bold text-foreground">AI Orbit — Strategy Lab</h1>
        </div>
        <PageTabs tabs={AI_ORBIT_TABS} />

        <div className="max-w-xl mx-auto mt-6">
          {/* Step indicator */}
          <div className="flex items-center mb-8">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      i < step
                        ? 'bg-[#00C805] text-white'
                        : i === step
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {i < step ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 mb-5 ${i < step ? 'bg-[#00C805]' : 'bg-border'}`} />
                )}
              </div>
            ))}
          </div>

          {deployed ? (
            <Card className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-[#00C805]/10 text-[#00C805] flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Agent Deployed</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {ticker.toUpperCase()} is now live in your fleet running the {riskProfile.toLowerCase()} strategy.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setDeployed(false);
                  setStep(0);
                  setTicker('');
                  setRiskProfile('BALANCED');
                }}
              >
                Deploy Another Agent
              </Button>
            </Card>
          ) : (
            <Card className="p-6">
              {step === 0 && (
                <div>
                  <h2 className="text-base font-semibold text-foreground mb-1">Select a Ticker</h2>
                  <p className="text-sm text-muted-foreground mb-4">Choose the underlying to run the Wheel Strategy on.</p>
                  <Label htmlFor="ticker" className="mb-1.5 block">
                    Ticker Symbol
                  </Label>
                  <Input
                    id="ticker"
                    placeholder="e.g. AMD"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    maxLength={6}
                  />
                </div>
              )}

              {step === 1 && (
                <div>
                  <h2 className="text-base font-semibold text-foreground mb-1">Choose a Risk Profile</h2>
                  <p className="text-sm text-muted-foreground mb-4">This governs strike selection and DTE for {ticker.toUpperCase()}.</p>
                  <div className="space-y-2">
                    {RISK_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRiskProfile(option.value)}
                        className={`w-full text-left p-4 rounded-lg border transition-all duration-150 ${
                          riskProfile === option.value
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <p className={`text-sm font-semibold ${riskProfile === option.value ? 'text-primary' : 'text-foreground'}`}>
                          {option.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="text-base font-semibold text-foreground mb-1">Confirm Buying Power Lockup</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Deploying this agent will reserve buying power to secure cash-covered puts and covered calls.
                  </p>
                  <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ticker</span>
                      <span className="font-medium text-foreground">{ticker.toUpperCase() || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Risk Profile</span>
                      <span className="font-medium text-foreground">{riskProfile}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Buying Power Lockup</span>
                      <span className="font-medium text-foreground">${buyingPowerLockup.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#FF9500]/30 bg-[#FF9500]/5 p-3 text-xs text-[#FF9500]">
                    This capital will be locked and unavailable for other trades while the agent is active.
                  </div>
                </div>
              )}

              <div className="flex justify-between mt-6 pt-5 border-t border-border">
                <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                  Back
                </Button>
                {step < STEPS.length - 1 ? (
                  <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance}>
                    Continue
                  </Button>
                ) : (
                  <Button onClick={handleDeploy} className="bg-[#00C805] hover:bg-[#00C805]/90 text-white">
                    Confirm &amp; Deploy
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
