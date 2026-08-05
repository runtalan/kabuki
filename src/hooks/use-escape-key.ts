'use client';

import { useEffect } from 'react';

// Closes the calling overlay when Escape is pressed. Listens on keydown at the
// document level so it works regardless of where focus sits inside the modal.
// Pass `active: false` to disable (e.g. a nested picker that owns Escape first).
export function useEscapeKey(onEscape: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onEscape();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onEscape, active]);
}
