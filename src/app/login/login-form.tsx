'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { LogIn, Sparkles } from 'lucide-react';
import { DEMO_USERNAME, DEMO_PASSWORD } from '@/lib/demo';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/home';
  const autoDemo = searchParams.get('demo') === '1';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  async function signInAs(u: string, p: string) {
    setError('');
    try {
      const result = await signIn('credentials', {
        username: u,
        password: p,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid username or password');
        return false;
      } else if (result?.ok) {
        router.push(callbackUrl);
        return true;
      }
      return false;
    } catch (err) {
      setError('An error occurred. Please try again.');
      return false;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    await signInAs(username, password);
    setIsLoading(false);
  }

  async function handleDemoLogin() {
    setIsDemoLoading(true);
    await signInAs(DEMO_USERNAME, DEMO_PASSWORD);
    setIsDemoLoading(false);
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Username */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          required
          className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || isDemoLoading}
        className="w-full mt-6 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
      >
        <LogIn className="w-5 h-5" />
        {isLoading ? 'Signing in...' : 'Sign in'}
      </button>

      <button
        type="button"
        onClick={handleDemoLogin}
        disabled={isLoading || isDemoLoading}
        className="w-full px-4 py-2.5 bg-transparent border border-border text-foreground rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
      >
        <Sparkles className="w-5 h-5" />
        {isDemoLoading ? 'Loading demo...' : 'Try the Demo'}
      </button>
    </form>
  );
}
