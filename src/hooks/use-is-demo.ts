'use client';

import { useEffect, useState } from 'react';

// Whether the current session is the shared, view-only public demo account.
// Components with edit/delete/create affordances should disable them and
// show a short explanation when this is true, rather than letting the
// action silently 403 against the server-side guard.
//
// There's no next-auth SessionProvider set up in this app (see
// settings/page.tsx for the established pattern this follows instead) — so
// this fetches /api/auth/session directly rather than using useSession().
export function useIsDemo(): boolean {
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((session) => {
        if (!cancelled) setIsDemo(Boolean(session?.user?.isDemo));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return isDemo;
}
