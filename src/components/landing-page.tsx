import Link from 'next/link';
import { Users, ShieldCheck, ArrowRight, Orbit, Zap, RefreshCw, Radio } from 'lucide-react';
import { ButtonsLogo } from './buttons-logo';
import { InteractiveAppDemo } from './interactive-app-demo';
import { AgentCard } from './ai-orbit/agent-card';
import { MOCK_AGENTS, TOTAL_PREMIUM_CAPTURED } from '@/lib/mock-ai-orbit';

// A single true circular arc, radius 90, passing through a near-vertical
// base point and a top point close to center — the classic badge sweep:
// expanding outward through the middle, tapering back in toward the tip,
// with no bezier-segment joint to kink the curve.
const ARC_RADIUS = 90;
const ARC_CENTER = { x: 82.61, y: 35.7 };
const ARC_THETA_START = 130.6; // degrees, at the base
const ARC_THETA_END = 203.38; // degrees, at the tip

function pointOnArc(t: number) {
  const theta = ARC_THETA_START + t * (ARC_THETA_END - ARC_THETA_START);
  const rad = (theta * Math.PI) / 180;
  const x = ARC_CENTER.x + ARC_RADIUS * Math.cos(rad);
  const y = ARC_CENTER.y + ARC_RADIUS * Math.sin(rad);
  const angle = theta + 90;
  return { x, y, angle };
}

function LaurelBranch() {
  // Base point (t=0) and tip point (t=1), both on the arc above.
  const stemPath = `M 24 104 A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 0 0`;
  const pointAt = pointOnArc;

  // Thicker, pointed leaf blade — fuller body while still tapering to a tip.
  const leafLen = 19;
  const leafWidth = 6.4;
  const leaf = `M 0 0 Q ${leafWidth} ${leafLen * 0.4} 0 ${leafLen} Q ${-leafWidth} ${leafLen * 0.4} 0 0 Z`;

  // Denser pairs from base to tip.
  const pairs = Array.from({ length: 7 }, (_, i) => 0.08 + i * (0.84 / 6));

  return (
    <>
      <path d={stemPath} stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {pairs.map((t, i) => {
        const { x, y, angle } = pointAt(t);
        // One leaf angled toward the outside of the curve, one toward the
        // inside — both tilted upward, forming a mirrored pair at this point.
        const outer = angle - 58;
        const inner = angle - 122;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d={leaf} fill="currentColor" transform={`rotate(${outer})`} />
            <path d={leaf} fill="currentColor" transform={`rotate(${inner})`} />
          </g>
        );
      })}
      {/* Small terminal bud at the tip */}
      <path
        d={leaf}
        fill="currentColor"
        transform={(() => {
          const { x, y, angle } = pointAt(0.97);
          return `translate(${x} ${y}) rotate(${angle}) scale(0.65)`;
        })()}
      />
    </>
  );
}

function LaurelWreath({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="-28 -10 88 122"
      className={`w-16 h-28 shrink-0 text-[#cccccc] dark:text-gray-600 ${flip ? 'scale-x-[-1]' : ''}`}
    >
      <LaurelBranch />
    </svg>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Announcement bar */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary to-accent text-primary-foreground text-center text-sm font-semibold tracking-tight py-2.5 px-4">
        <span className="inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-pulse" />
          🪙 Est. 2026 — two people, one ledger, zero spreadsheets
        </span>
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-20 backdrop-blur-md bg-background/80 border-b border-border/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ButtonsLogo className="w-9 h-9" />
            <span
              className="text-lg font-bold text-foreground tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Buttons
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login?demo=1"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#00C805] via-[#AF52DE] to-[#FF9500] text-white text-sm font-semibold rounded-full shadow-md shadow-[#AF52DE]/25 hover:shadow-lg hover:shadow-[#AF52DE]/35 hover:-translate-y-0.5 transition-all"
            >
              Try the Demo
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-full shadow-md shadow-primary/20 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 transition-all"
            >
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] -z-10 bg-gradient-to-b from-primary/10 via-accent/5 to-transparent blur-2xl"
          aria-hidden
        />

        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-muted/80 border border-border text-xs font-semibold text-muted-foreground mb-7 shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          Private · Built for exactly two people
        </div>

        <h1
          style={{ fontFamily: 'var(--font-serif)' }}
          className="text-5xl md:text-7xl font-medium text-foreground leading-[1.05] tracking-tight mb-7"
        >
          Every dollar's a button.
          <br />
          <span className="italic bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Let's collect them
          </span>{' '}
          together.
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-3 leading-relaxed">
          Buttons is the private money hub built exclusively for Renato &amp; Claudia —
          every account, every button, one cozy place to keep score.
        </p>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-9">
          It also powers AI Orbit, our agentic Wheel Strategy trading system.
        </p>

        <div className="flex flex-col items-center gap-3.5">
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all text-base"
          >
            Sign in to your buttons
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="text-xs text-muted-foreground">
            No sign-ups here — just the two of us.{' '}
            <Link href="/login?demo=1" className="underline hover:text-foreground transition-colors">
              Try the demo
            </Link>{' '}
            to look around.
          </p>
        </div>
      </section>

      {/* Interactive Product Demo */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="relative rounded-[28px] p-px bg-gradient-to-br from-primary/30 via-border to-accent/30 shadow-xl shadow-foreground/5">
          <div className="rounded-[27px] bg-background overflow-hidden">
            <InteractiveAppDemo />

            {/* Built for exactly two — footer strip */}
            <div className="flex items-center gap-4 px-6 py-5 border-t border-border bg-gradient-to-br from-card to-accent/5">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-md shadow-accent/20">
                <Users className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Built for exactly two</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Assign accounts to 👦 Renato, 👧 Claudia, or Joint — and get
                  reports that already know whose buttons are whose.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6 pb-12 flex items-center gap-4">
        <div className="flex-1 border-t border-dashed border-border" />
        <span className="w-1.5 h-1.5 rounded-full bg-border" />
        <div className="flex-1 border-t border-dashed border-border" />
      </div>

      {/* AI Orbit marketing section */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-zinc-700 p-8 md:p-12">
          {/* Ambient brand-color glows */}
          <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#00C805]/20 blur-[100px]" />
          <div className="pointer-events-none absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-[#AF52DE]/20 blur-[110px]" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-[#FF9500]/15 blur-[100px]" />

          <div className="relative">
            {/* Big AI Orbit brand mark */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00C805] via-[#AF52DE] to-[#FF9500] flex items-center justify-center shadow-lg shadow-black/30">
                <Orbit className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-[#00C805] via-[#AF52DE] to-[#FF9500] bg-clip-text text-transparent">
                AI Orbit
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold text-white leading-tight mb-4 max-w-2xl">
              Options premium, on autopilot.
            </h2>
            <p className="text-zinc-400 max-w-xl mb-10 leading-relaxed">
              AI Orbit runs the Wheel Strategy for you — selling cash-secured puts,
              rolling into covered calls, and stacking the premium straight into
              household income, around the clock.
            </p>

            {/* Bento grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Fleet Command live preview */}
              <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
                <div className="relative h-64 md:h-80 overflow-hidden bg-muted/40">
                  <div className="pointer-events-none select-none p-4 origin-top scale-[0.82] md:scale-90">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-foreground">AI Orbit — Fleet Command</p>
                      <span className="text-[11px] text-muted-foreground">{MOCK_AGENTS.length} agents deployed</span>
                    </div>
                    <div className="mb-4">
                      <p className="text-[11px] font-medium text-muted-foreground mb-0.5">
                        Total Premium Captured
                      </p>
                      <p className="text-2xl font-bold text-[#00C805] tracking-tight">
                        $
                        {TOTAL_PREMIUM_CAPTURED.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {MOCK_AGENTS.slice(0, 2).map((agent) => (
                        <AgentCard key={agent.id} agent={agent} />
                      ))}
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-700 to-transparent" />
                </div>
              </div>

              {/* Yield Analytics chart placeholder */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col">
                <p className="text-sm font-medium text-zinc-300 mb-1">Yield Analytics</p>
                <p className="text-xs text-zinc-500 mb-4">Premium collected, trailing weeks</p>
                <svg viewBox="0 0 220 110" className="w-full flex-1" preserveAspectRatio="none">
                  {[0, 22, 44, 66, 88, 110].map((y) => (
                    <line key={y} x1="0" y1={y} x2="220" y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  ))}
                  <polyline
                    points="0,95 30,88 60,70 90,74 120,50 150,44 180,20 220,10"
                    fill="none"
                    stroke="#00C805"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polygon
                    points="0,95 30,88 60,70 90,74 120,50 150,44 180,20 220,10 220,110 0,110"
                    fill="url(#yieldGradient)"
                  />
                  <defs>
                    <linearGradient id="yieldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00C805" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#00C805" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
                <p className="text-xs text-[#00C805] font-medium mt-3">+ Premium Collected</p>
              </div>

              {/* Feature bullets */}
              <div className="md:col-span-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 shrink-0 rounded-lg bg-[#00C805]/10 flex items-center justify-center">
                    <RefreshCw className="w-4.5 h-4.5 text-[#00C805]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-0.5">Automated Cash-Secured Puts</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Agents open puts sized to your buying power, tuned to your risk band.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 shrink-0 rounded-lg bg-[#FF9500]/10 flex items-center justify-center">
                    <Zap className="w-4.5 h-4.5 text-[#FF9500]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-0.5">Covered Call Harvesting</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Once assigned, agents flip to calls and keep collecting on the shares.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 shrink-0 rounded-lg bg-[#AF52DE]/10 flex items-center justify-center">
                    <Radio className="w-4.5 h-4.5 text-[#AF52DE]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-0.5">Real-Time WebSocket Flight Logs</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Every fill, roll, and assignment streams in live as it happens.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fun trust row */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: 'Most Organized Household', sub: 'Self-Awarded, 2026' },
            { label: 'Better Than a Shared Spreadsheet', sub: 'Ex-Spreadsheet Users' },
            { label: '100% Approved', sub: 'By Renato & Claudia' },
            { label: '★★★★★', sub: '2 users, 2 five-star reviews' },
          ].map((badge) => (
            <div key={badge.label} className="flex flex-col items-center gap-3">
              <div className="flex items-center justify-center gap-2 w-full">
                <LaurelWreath />
                <div>
                  <p className="font-semibold text-foreground text-sm">{badge.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{badge.sub}</p>
                </div>
                <LaurelWreath flip />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/20">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ButtonsLogo className="w-7 h-7" />
            <span
              className="text-sm font-semibold text-foreground tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Buttons
            </span>
            <span className="text-xs text-muted-foreground">— for kabuki</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 Buttons. Just for us two.
          </p>
        </div>
      </footer>
    </div>
  );
}
