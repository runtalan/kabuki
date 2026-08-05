import Link from 'next/link';
import { Sparkles, Users, ShieldCheck, ArrowRight } from 'lucide-react';
import { ButtonsLogo } from './buttons-logo';
import { InteractiveAppDemo } from './interactive-app-demo';

function LaurelBranch() {
  // Classic laurel crescent: stem bulges outward through the middle and
  // curves back inward at both ends, lined with flat, pointed leaves.
  const leaves = Array.from({ length: 13 }, (_, i) => 0.04 + i * (0.92 / 12));

  const stemPath = 'M 22 102 Q -14 70 -2 40 Q 8 12 46 -2';

  const pointAt = (t: number) => {
    const seg1 = t <= 0.5;
    const lt = seg1 ? t / 0.5 : (t - 0.5) / 0.5;
    const p0 = seg1 ? { x: 22, y: 102 } : { x: -2, y: 40 };
    const p1 = seg1 ? { x: -14, y: 70 } : { x: 8, y: 12 };
    const p2 = seg1 ? { x: -2, y: 40 } : { x: 46, y: -2 };
    const x = (1 - lt) ** 2 * p0.x + 2 * (1 - lt) * lt * p1.x + lt ** 2 * p2.x;
    const y = (1 - lt) ** 2 * p0.y + 2 * (1 - lt) * lt * p1.y + lt ** 2 * p2.y;
    const dx = 2 * (1 - lt) * (p1.x - p0.x) + 2 * lt * (p2.x - p0.x);
    const dy = 2 * (1 - lt) * (p1.y - p0.y) + 2 * lt * (p2.y - p0.y);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return { x, y, angle };
  };

  // Flat, blade-like leaf: thin relative to its length, pointed at both ends.
  const leafLen = 17;
  const leafWidth = 3.4;

  return (
    <>
      <path d={stemPath} stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {leaves.map((t, i) => {
        const { x, y, angle } = pointAt(t);
        const outward = angle - 62;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${outward})`}>
            <path
              d={`M 0 0 Q ${leafWidth} ${leafLen * 0.5} 0 ${leafLen} Q ${-leafWidth} ${leafLen * 0.5} 0 0 Z`}
              fill="currentColor"
            />
          </g>
        );
      })}
    </>
  );
}

function LaurelWreath({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="-20 -6 78 114"
      className={`w-14 h-24 shrink-0 text-gray-300 dark:text-gray-700 ${flip ? 'scale-x-[-1]' : ''}`}
    >
      <LaurelBranch />
    </svg>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Announcement bar */}
      <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground text-center text-sm font-medium py-2 px-4">
        🪙 Est. 2026 — two people, one ledger, zero spreadsheets
      </div>

      {/* Nav */}
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <ButtonsLogo className="w-9 h-9" />
          <span
            className="text-lg font-bold text-foreground tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Buttons
          </span>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 shadow-sm hover:shadow-md transition-all"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-xs font-medium text-muted-foreground mb-6">
          <ShieldCheck className="w-3.5 h-3.5" />
          Private · Built for exactly two people
        </div>

        <h1
          style={{ fontFamily: 'var(--font-serif)' }}
          className="text-5xl md:text-6xl font-medium text-foreground leading-[1.08] mb-6"
        >
          Every dollar's a button.
          <br />
          <span className="italic text-primary">Let's collect them</span> together.
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
          Buttons is the private money hub built exclusively for Renato &amp; Claudia —
          every account, every button, one cozy place to keep score.
        </p>

        <div className="flex flex-col items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 shadow-md hover:shadow-lg transition-all text-base"
          >
            Sign in to your buttons
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-muted-foreground">
            No sign-ups here — just the two of us.
          </p>
        </div>
      </section>

      {/* Interactive Product Demo */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <InteractiveAppDemo />
      </section>

      {/* Explore cards */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6">
          What's inside
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-primary/5 p-8">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-5">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Options premium analysis
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Buttons calculates standard deviation against your actual holdings,
              then surfaces the option premiums with the best odds of expiring
              profitable — so every play is sized to how your portfolio really moves.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-accent/5 p-8">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center mb-5">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Built for exactly two
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Assign accounts to 👦 Renato, 👧 Claudia, or Joint — and get
              reports that already know whose buttons are whose.
            </p>
          </div>
        </div>
      </section>

      {/* Fun trust row */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
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
      <footer className="border-t border-border">
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
