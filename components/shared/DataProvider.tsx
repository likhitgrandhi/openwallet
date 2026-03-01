'use client';

import { useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { useBudgetStore } from '@/lib/store/useBudgetStore';
import { useSubscriptionStore } from '@/lib/store/useSubscriptionStore';

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  // If the Google token could not be silently refreshed, force a new sign-in
  // so the user never gets a mysterious "authentication error" mid-session.
  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError') {
      signIn('google');
    }
  }, [session?.error]);
  // 'loading' = still fetching session; 'authenticated' = signed in; 'unauthenticated' = demo mode
  const isAuthenticated = status === 'authenticated';
  const isReady = status !== 'loading';

  const { loadSeedData: loadTxSeed, loadFromDB: loadTxDB, isLoaded: txLoaded } = useTransactionStore();
  const { loadSeedData: loadBudgetSeed, loadFromDB: loadBudgetDB, isLoaded: budgetsLoaded } = useBudgetStore();
  const { loadSeedData: loadSubSeed, loadFromDB: loadSubDB, isLoaded: subsLoaded } = useSubscriptionStore();

  const loadAll = useCallback(() => {
    if (isAuthenticated) {
      loadTxDB();
      loadBudgetDB();
      loadSubDB();
    } else {
      // Demo mode — in-memory seed data only, nothing persisted to IndexedDB
      loadTxSeed();
      loadBudgetSeed();
      loadSubSeed();
    }
  }, [isAuthenticated, loadTxDB, loadBudgetDB, loadSubDB, loadTxSeed, loadBudgetSeed, loadSubSeed]);

  // Initial load once session status resolves
  useEffect(() => {
    if (!isReady) return;
    if (!txLoaded || !budgetsLoaded || !subsLoaded) loadAll();
  }, [isReady, txLoaded, budgetsLoaded, subsLoaded, loadAll]);

  // Reload from DB after a Gmail sync completes
  useEffect(() => {
    if (!isAuthenticated) return;
    const onSyncComplete = () => {
      loadTxDB();
      loadBudgetDB();
      loadSubDB();
    };
    window.addEventListener('expense:sync-complete', onSyncComplete);
    return () => window.removeEventListener('expense:sync-complete', onSyncComplete);
  }, [isAuthenticated, loadTxDB, loadBudgetDB, loadSubDB]);

  return <>{children}</>;
}
