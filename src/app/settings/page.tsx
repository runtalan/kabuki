'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { PlaidLinkButton } from '@/components/plaid-link-button';
import { AppleCardIntegration } from '@/components/settings/apple-card-integration';
import { AppleCardDebugPanel } from '@/components/settings/apple-card-debug-panel';
import { useIsDemo } from '@/hooks/use-is-demo';

export default function SettingsPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [username, setUsername] = useState<string | null>(null);
  const isDemo = useIsDemo();

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');

    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((session) => {
        const name = session?.user?.username || session?.user?.email;
        if (name) setUsername(name);
      })
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground mb-8">Manage your account and preferences.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Account</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Username</label>
                <p className="text-muted-foreground text-sm mt-1">{username || '—'}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Preferences</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Theme</label>
                  <p className="text-muted-foreground text-xs mt-1">
                    {theme === 'light' ? 'Light mode' : 'Dark mode'}
                  </p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  title="Toggle theme"
                >
                  {theme === 'light' ? (
                    <Moon className="w-5 h-5 text-foreground" />
                  ) : (
                    <Sun className="w-5 h-5 text-foreground" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Linked Accounts</h2>
          <p className="text-muted-foreground mb-4">Manage your Plaid connections</p>
          {isDemo ? (
            <p className="text-sm text-muted-foreground">View-only in demo mode — bank linking is disabled.</p>
          ) : (
            <PlaidLinkButton />
          )}
        </div>

        <div className="mt-8 bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Integrations</h2>
          <AppleCardIntegration isDemo={isDemo} />
          <div className="mt-4">
            <AppleCardDebugPanel isDemo={isDemo} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
