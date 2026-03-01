'use client';

import { create } from 'zustand';
import { runDirectSync, cancelDirectSync } from '../gmail/syncDirect';
import { db } from '../db/schema';

export type SyncStatus = 'idle' | 'fetching' | 'running' | 'complete' | 'error';

interface SyncProgress {
  scanned: number;
  total: number;
  parsed: number;
}

interface SyncStore {
  syncStatus: SyncStatus;
  progress: SyncProgress;
  errorMessage: string | null;
  lastSyncedAt: Date | null;
  startSync: (accessToken: string, options?: { fromDate?: Date; lookbackMonths?: number; selectedSenders?: string[] }) => Promise<void>;
  cancelSync: () => void;
  resetSync: () => void;
  loadSyncState: () => Promise<void>;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  syncStatus: 'idle',
  progress: { scanned: 0, total: 0, parsed: 0 },
  errorMessage: null,
  lastSyncedAt: null,

  loadSyncState: async () => {
    const state = await db.syncState.get(1);
    if (state?.lastSyncedAt) set({ lastSyncedAt: new Date(state.lastSyncedAt) });
  },

  startSync: async (accessToken, options = {}) => {
    if (get().syncStatus === 'running' || get().syncStatus === 'fetching') return;

    const syncState = await db.syncState.get(1);
    const lastSyncedAt = syncState?.lastSyncedAt ? new Date(syncState.lastSyncedAt) : null;

    // 'fetching' = counting emails / waiting for first PROGRESS event
    set({ syncStatus: 'fetching', progress: { scanned: 0, total: 0, parsed: 0 }, errorMessage: null });

    runDirectSync(
      accessToken,
      {
        fromDate: options.fromDate,
        lookbackMonths: options.lookbackMonths ?? 6,
        // lastSyncedAt is ignored when an explicit fromDate is provided
        lastSyncedAt: options.fromDate ? null : lastSyncedAt,
        selectedSenders: options.selectedSenders,
      },
      (msg) => {
        switch (msg.type) {
          case 'PROGRESS':
            set({
              syncStatus: 'running',
              progress: { scanned: msg.scanned, total: msg.total, parsed: msg.parsed },
            });
            break;
          case 'TRANSACTION_BATCH':
            set(s => ({ progress: { ...s.progress, parsed: msg.parsed } }));
            break;
          case 'COMPLETE':
            set({
              syncStatus: 'complete',
              progress: { scanned: msg.totalScanned, total: msg.totalScanned, parsed: msg.totalParsed },
              lastSyncedAt: new Date(),
            });
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('expense:sync-complete'));
            }
            break;
          case 'ERROR':
            set({ syncStatus: 'error', errorMessage: msg.message });
            break;
        }
      }
    );
  },

  cancelSync: () => {
    cancelDirectSync();
    set({ syncStatus: 'idle' });
  },

  resetSync: () => {
    set({ syncStatus: 'idle', progress: { scanned: 0, total: 0, parsed: 0 }, errorMessage: null });
  },
}));
