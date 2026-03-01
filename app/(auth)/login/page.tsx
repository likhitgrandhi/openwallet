'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await signIn('google', { callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col">
      {/* Centered auth — minimal, institutional */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[28px] font-bold text-[#0A0A0A] tracking-[-0.03em] leading-[1.2] mb-2">
            Sign in to Open Wallet
          </h1>
          <p className="text-[14px] text-[#525252] leading-[1.5] mb-8">
            Connect your Google account to automatically pull your bank transaction emails.
          </p>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 h-[44px] px-5 py-2.5 rounded-[8px] bg-[#0A0A0A] text-white text-[14px] font-medium tracking-[-0.01em] border-[1.5px] border-[#0A0A0A] transition-all duration-150 hover:bg-[#2C2C2C] hover:-translate-y-px disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:bg-[#0A0A0A]"
          >
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            {isLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <div className="mt-6 text-center">
            <Link
              href="/api/auth/demo?callbackUrl=/"
              className="text-[12px] text-[#8A8A8A] hover:text-[#525252] underline transition-colors"
            >
              Skip — explore with demo data
            </Link>
          </div>

          <p className="mt-8 text-[11px] text-[#8A8A8A] text-center leading-[1.5]">
            We request Gmail read-only access. Your transaction data is processed locally and never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
