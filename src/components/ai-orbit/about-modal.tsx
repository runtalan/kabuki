'use client';

import { Rocket, RefreshCw, ShieldCheck, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export function AboutAiOrbitModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-10 sm:max-w-3xl">
        <DialogHeader className="gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
            <Rocket className="w-6 h-6" />
          </div>
          <DialogTitle className="text-2xl font-semibold tracking-tight">What is AI Orbit?</DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            Autonomous agents that run your Wheel Strategy for you, around the clock.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 text-[15px] leading-relaxed text-foreground mt-2">
          <p>
            AI Orbit deploys one <strong>AI agent per ticker</strong> to continuously manage the{' '}
            <a
              href="https://en.wikipedia.org/wiki/Covered_option"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-dotted underline-offset-2"
            >
              Wheel Strategy
            </a>
            : selling cash-secured puts to collect premium, taking assignment of shares if the
            put finishes in the money, then selling covered calls against those shares to
            collect more premium — repeating the cycle indefinitely.
          </p>

          <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
            <div className="flex gap-4 p-5">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <RefreshCw className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="font-semibold text-base">Runs continuously</p>
                <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                  A scheduled cron poll checks every active agent throughout market hours — no
                  manual order entry required. Each agent evaluates whether to open, roll, or
                  close its position based on your chosen risk profile and target DTE.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-5">
              <div className="w-9 h-9 rounded-full bg-[#AF52DE]/10 text-[#AF52DE] flex items-center justify-center shrink-0">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="font-semibold text-base">Put phase → Call phase</p>
                <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                  While an agent holds no shares, it sells puts (<span className="text-[#AF52DE] font-medium">purple</span>).
                  Once assigned shares, it switches to selling calls (<span className="text-[#FF9500] font-medium">orange</span>)
                  against that position — the &ldquo;wheel&rdquo; turning from put to call and back again.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-5">
              <div className="w-9 h-9 rounded-full bg-[#00C805]/10 text-[#00C805] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="font-semibold text-base">You stay in control</p>
                <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                  Pause or resume any agent from Fleet Command, tune its risk profile in the
                  Strategy Tuner, or hit the Launch Control E-Stop to halt the entire fleet
                  immediately.
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Every trade is logged in real time in Flight Logs, and captured premium is tracked
            per agent and fleet-wide in Yield Analytics.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
