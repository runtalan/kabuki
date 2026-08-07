'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import type { Agent, RiskProfile } from '@/types/ai-orbit';

const RISK_PROFILES: { value: RiskProfile; label: string; description: string }[] = [
  { value: 'CONSERVATIVE', label: 'Conservative', description: 'Lower delta, farther OTM strikes, longer DTE.' },
  { value: 'BALANCED', label: 'Balanced', description: 'Moderate delta, standard 30-45 DTE cycle.' },
  { value: 'AGGRESSIVE', label: 'Aggressive', description: 'Higher delta, closer strikes, shorter DTE for faster premium turnover.' },
];

export function StrategyTuner({ agent }: { agent: Agent }) {
  const [riskProfile, setRiskProfile] = useState<RiskProfile>(agent.riskProfile);
  const [targetDte, setTargetDte] = useState(agent.targetDte);

  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-foreground mb-1">Strategy Tuner</h3>
      <p className="text-sm text-muted-foreground mb-5">Adjust how aggressively this agent trades the wheel.</p>

      <div className="mb-6">
        <p className="text-sm font-medium text-foreground mb-2.5">Risk Profile</p>
        <div className="grid grid-cols-3 gap-2">
          {RISK_PROFILES.map((profile) => (
            <button
              key={profile.value}
              type="button"
              onClick={() => setRiskProfile(profile.value)}
              className={`text-left p-3 rounded-lg border transition-all duration-150 ${
                riskProfile === profile.value
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <p className={`text-sm font-semibold ${riskProfile === profile.value ? 'text-primary' : 'text-foreground'}`}>
                {profile.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{profile.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-sm font-medium text-foreground">Target DTE</p>
          <span className="text-sm font-semibold text-foreground">{targetDte} days</span>
        </div>
        <Slider
          value={[targetDte]}
          onValueChange={(value) => setTargetDte(Array.isArray(value) ? value[0] : value)}
          min={7}
          max={60}
          step={1}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
          <span>7d</span>
          <span>60d</span>
        </div>
      </div>

      <Button className="w-full">Save Strategy</Button>
    </Card>
  );
}
