import Link from 'next/link';
import { Compass } from 'lucide-react';

// App Router renders this for any route that doesn't match a page —
// otherwise a bad/stale link (a bookmark to a since-removed page, a typo'd
// href) hits Next's bare default 404 with no way back into the app.
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <Compass className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2">Page not found</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          There's nothing here. The page may have moved or the link may be out of date.
        </p>
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}
