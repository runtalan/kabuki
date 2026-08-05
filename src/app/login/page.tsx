'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { ButtonsLogo } from '@/components/buttons-logo';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-10">
          <ButtonsLogo className="w-11 h-11" />
          <h1 className="text-3xl font-bold text-foreground">Buttons</h1>
        </Link>

        {/* Form Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Welcome back</h2>
            <p className="text-muted-foreground text-sm">
              Sign in to see your buttons.
            </p>
          </div>

          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
