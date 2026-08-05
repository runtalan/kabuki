import Link from 'next/link';
import { Sparkles, Users, ShieldCheck, ArrowRight } from 'lucide-react';
import { ButtonsLogo } from './buttons-logo';

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

      {/* Product preview mockup */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* fake window chrome */}
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/40">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1 space-y-2 hidden md:block">
              {['Dashboard', 'Accounts', 'Transactions', 'Reports', 'Categories'].map(
                (item, i) => (
                  <div
                    key={item}
                    className={`px-3 py-2 rounded-lg text-xs font-medium ${
                      i === 0
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {item}
                  </div>
                )
              )}
            </div>

            <div className="md:col-span-3 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white">
                  <p className="text-[10px] uppercase tracking-wide text-blue-100 mb-1">
                    Net Worth
                  </p>
                  <p className="text-xl font-bold">$128,402</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-4 text-white">
                  <p className="text-[10px] uppercase tracking-wide text-emerald-100 mb-1">
                    Income
                  </p>
                  <p className="text-xl font-bold">$8,240</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 p-4 text-white">
                  <p className="text-[10px] uppercase tracking-wide text-purple-100 mb-1">
                    Saved
                  </p>
                  <p className="text-xl font-bold">31%</p>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3">
                  Spending by Category
                </p>
                <div className="flex items-end gap-2 h-20">
                  {[40, 65, 30, 80, 50, 25, 60].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-md bg-gradient-to-t from-primary to-accent"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
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
              Smart auto-tagging
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              United Airlines? Travel. Whole Foods? Groceries. Buttons quietly
              learns your merchants so you almost never have to tag anything
              by hand.
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
            <div key={badge.label}>
              <p className="font-semibold text-foreground text-sm">{badge.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{badge.sub}</p>
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
