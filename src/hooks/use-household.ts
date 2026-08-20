'use client';

import { useEffect, useState } from 'react';
import {
  HOUSEHOLDS,
  householdByUsername,
  type HouseholdDefinition,
} from '@/lib/households';

// Resolves the signed-in user's household client-side. Follows the same
// direct /api/auth/session fetch pattern as useIsDemo — there's no next-auth
// SessionProvider in this app. Returns null until the session loads (render
// a skeleton/nothing, never another household's names). Demo and
// unaffiliated users fall back to renato-claudia, matching getUser() in
// lib/auth.ts.
//
// Pass enabled=false when the caller already knows the household (e.g. a
// server page passed it down) to skip the fetch.
export function useHousehold(enabled = true): HouseholdDefinition | null {
  const [household, setHousehold] = useState<HouseholdDefinition | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((session) => {
        if (cancelled) return;
        const username = session?.user?.username as string | undefined;
        setHousehold(
          (username && householdByUsername(username)) || HOUSEHOLDS['renato-claudia']
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return household;
}
