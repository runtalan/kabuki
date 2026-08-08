'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Sparkles } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoDemo = searchParams.get('demo') === '1';

  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [isLoadingDev, setIsLoadingDev] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Next.js statically inlines process.env.NODE_ENV in the client bundle at
  // build time (no NEXT_PUBLIC_ prefix needed) — this is never 'development'
  // in a deployed build, so this button can't render outside local dev.
  const isDev = process.env.NODE_ENV !== 'production';

  async function handleGoogleSignIn() {
    setIsLoadingGoogle(true);
    setError(null);
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
      setIsLoadingGoogle(false);
    }
  }

  async function handleDemoLogin() {
    setIsLoadingDemo(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/demo', { method: 'POST' });
      if (response.ok) {
        router.push('/dashboard');
      } else {
        setError('Demo login failed.');
        setIsLoadingDemo(false);
      }
    } catch (err) {
      setError('Demo login error.');
      setIsLoadingDemo(false);
    }
  }

  async function handleDevLogin(username: string) {
    setIsLoadingDev(username);
    setError(null);
    try {
      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (response.ok) {
        router.push('/dashboard');
      } else {
        setError('Dev login failed.');
        setIsLoadingDev(null);
      }
    } catch (err) {
      setError('Dev login error.');
      setIsLoadingDev(null);
    }
  }

  // Coming from the landing page's "Try the Demo" link (?demo=1) — sign in
  // as demo immediately, no extra click needed.
  useEffect(() => {
    if (autoDemo) {
      handleDemoLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDemo]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Google Sign In Button */}
      <button
        onClick={handleGoogleSignIn}
        disabled={isLoadingGoogle || isLoadingDemo}
        className="w-full px-4 py-2.5 bg-card border border-border text-foreground rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isLoadingGoogle ? 'Signing in...' : 'Sign in with Google'}
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-background text-muted-foreground">or</span>
        </div>
      </div>

      {/* Demo Login Button */}
      <button
        onClick={handleDemoLogin}
        disabled={isLoadingGoogle || isLoadingDemo}
        className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
      >
        <Sparkles className="w-5 h-5" />
        {isLoadingDemo ? 'Loading demo...' : 'Try the Demo'}
      </button>

      {/* Local-dev-only bypass — statically stripped from any production
          build, see the isDev comment above. */}
      {isDev && (
        <div className="pt-2 border-t border-dashed border-border space-y-2">
          <p className="text-xs text-muted-foreground text-center pt-2">Dev only</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleDevLogin('renato')}
              disabled={!!isLoadingDev}
              className="flex-1 px-3 py-2 bg-muted text-foreground text-sm rounded-lg hover:bg-muted/70 disabled:opacity-50 transition-colors"
            >
              {isLoadingDev === 'renato' ? 'Signing in...' : 'Dev login: renato'}
            </button>
            <button
              onClick={() => handleDevLogin('claudia')}
              disabled={!!isLoadingDev}
              className="flex-1 px-3 py-2 bg-muted text-foreground text-sm rounded-lg hover:bg-muted/70 disabled:opacity-50 transition-colors"
            >
              {isLoadingDev === 'claudia' ? 'Signing in...' : 'Dev login: claudia'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
