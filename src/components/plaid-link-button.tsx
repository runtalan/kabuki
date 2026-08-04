'use client';

import { useCallback } from 'react';

export function PlaidLinkButton() {
  const handleClick = useCallback(async () => {
    alert('Plaid integration requires PLAID_CLIENT_ID and PLAID_SECRET to be configured in your Firebase secrets.');
  }, []);

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
    >
      Link Bank Account
    </button>
  );
}
