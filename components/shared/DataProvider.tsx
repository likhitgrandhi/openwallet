'use client';

import { useEffect, useCallback } from 'react';
import { authClient } from '@/lib/auth-client';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { useBudgetStore } from '@/lib/store/useBudgetStore';
import { useSubscriptionStore } from '@/lib/store/useSubscriptionStore';

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  // Better Auth handles token refresh automatically
  // 'loading' = still fetching session; 'authenticated' = signed in; 'unauthenticated' = demo mode
  const isAuthenticated = !!session?.user;
  const isReady = !isPending;

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
