'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Loader } from 'lucide-react';
import { useIsDemo } from '@/hooks/use-is-demo';

declare global {
  interface Window {
    Plaid: any;
  }
}

export function PlaidLinkButton() {
  const isDemo = useIsDemo();
  const [linkToken, setLinkToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  // Guards against firing a second link/exchange while one is still in
  // flight. Linking is slow (accounts + 30 days of transactions + logo
  // caching all happen before the response), and a second attempt against the
  // same institution is what produced duplicate accounts.
  const inFlight = useRef(false);

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
    if (inFlight.current) return;
    inFlight.current = true;
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
        inFlight.current = false;
        setLoading(false);
        return;
      }

      setLinkToken(data.link_token);

      // Open Plaid Link
      if (window.Plaid) {
        window.Plaid.create({
          token: data.link_token,
          onSuccess: async (publicToken: string, metadata: any) => {
            console.log('Plaid success:', metadata);

            // Every failure path below has to clear the spinner. Before, a
            // rejected fetch escaped this callback as an unhandled rejection
            // and the button span "Linking..." forever — which is exactly
            // what pushed the user to refresh and link the same institution
            // again, duplicating its accounts.
            try {
              // Exchange public token for access token
              const exchangeResponse = await fetch('/api/plaid/exchange-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  public_token: publicToken,
                  institution_name: metadata?.institution?.name || null,
                  institution_id: metadata?.institution?.institution_id || null,
                }),
              });

              const exchangeData = await exchangeResponse.json().catch(() => ({}));
              if (exchangeResponse.ok) {
                alert('✅ Bank account linked and synced!');
                window.location.href = '/accounts';
                return; // navigating away — leave the spinner up
              }
              alert('Error: ' + (exchangeData.error || 'Failed to link account'));
            } catch (error) {
              alert(
                'Linking did not complete: ' +
                  (error instanceof Error ? error.message : 'Unknown error') +
                  '\n\nOpen Accounts and refresh before trying again — the ' +
                  'account may already be linked.'
              );
            } finally {
              inFlight.current = false;
              setLoading(false);
            }
          },
          onExit: (err: any, metadata: any) => {
            // Plaid reports the real failure here. Without surfacing it the
            // user only sees a generic "something went wrong" — the
            // error_code and request_id are what Plaid support needs to
            // diagnose an institution-side outage.
            if (err) {
              console.error('Plaid error:', err, metadata);
              const parts = [
                err.display_message || err.error_message,
                err.error_code ? `(${err.error_code})` : null,
                metadata?.institution?.name
                  ? `Institution: ${metadata.institution.name}`
                  : null,
                metadata?.request_id ? `Request ID: ${metadata.request_id}` : null,
              ].filter(Boolean);
              alert('Plaid could not link this account.\n\n' + parts.join('\n'));
            }
            inFlight.current = false;
            setLoading(false);
          },
        }).open();
      } else {
        alert(
          'Plaid Link failed to load. Check your network connection or any ' +
            'ad/script blockers, then try again.'
        );
        inFlight.current = false;
        setLoading(false);
      }
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  return (
    <button
      onClick={handleClick}
      disabled={loading || isDemo}
      title={isDemo ? 'View-only in demo mode' : undefined}
      className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
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
