'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Loader } from 'lucide-react';

declare global {
  interface Window {
    Plaid: any;
  }
}

export function PlaidLinkButton() {
  const [linkToken, setLinkToken] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Load Plaid script once per page
  useEffect(() => {
    const src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handleClick = useCallback(async () => {
    setLoading(true);
    try {
      // Get link token
      const response = await fetch('/api/plaid/link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        alert('Error: ' + (data.error || data.details || 'Failed to get link token'));
        return;
      }

      setLinkToken(data.link_token);

      // Open Plaid Link
      if (window.Plaid) {
        window.Plaid.create({
          token: data.link_token,
          onSuccess: async (publicToken: string, metadata: any) => {
            console.log('Plaid success:', metadata);

            // Exchange public token for access token
            const exchangeResponse = await fetch('/api/plaid/exchange-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                public_token: publicToken,
                institution_name: metadata?.institution?.name || null,
              }),
            });

            const exchangeData = await exchangeResponse.json();
            if (exchangeResponse.ok) {
              alert('✅ Bank account linked and synced!');
              window.location.href = '/accounts';
            } else {
              alert('Error: ' + (exchangeData.error || 'Failed to link account'));
            }
          },
          onExit: (err: any) => {
            if (err) console.error('Plaid error:', err);
            setLoading(false);
          },
        }).open();
      }
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setLoading(false);
    }
  }, []);

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 active:scale-95 disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-lg"
    >
      {loading ? (
        <>
          <Loader className="w-5 h-5 animate-spin" />
          <span>Linking...</span>
        </>
      ) : (
        <>
          <Plus className="w-5 h-5" />
          <span>Link Bank Account</span>
        </>
      )}
    </button>
  );
}
