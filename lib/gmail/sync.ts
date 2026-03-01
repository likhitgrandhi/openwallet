'use client';

import type { Transaction } from '../db/schema';

export type WorkerMessage =
  | { type: 'PROGRESS'; scanned: number; total: number; parsed: number }
  | { type: 'TRANSACTION_BATCH'; transactions: Transaction[]; parsed: number }
  | { type: 'COMPLETE'; totalParsed: number; totalScanned: number }
  | { type: 'ERROR'; message: string };

export interface SyncOptions {
  /** Explicit start date — takes priority over lookbackMonths */
  fromDate?: Date;
  /** Fallback: how many months back to scan when no fromDate is supplied */
  lookbackMonths?: number;
  lastSyncedAt?: Date | null;
  selectedSenders?: string[];   // flat list of Gmail from: addresses to search
}

let activeWorker: Worker | null = null;

export function startGmailSync(
  accessToken: string,
  options: SyncOptions,
  onMessage: (msg: WorkerMessage) => void
): () => void {
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }

  activeWorker = new Worker(new URL('./worker.ts', import.meta.url));

  activeWorker.onmessage = (e: MessageEvent<WorkerMessage>) => onMessage(e.data);

  activeWorker.onerror = (e) =>
    onMessage({ type: 'ERROR', message: e.message ?? 'Worker error' });

  activeWorker.postMessage({
    type: 'START_SYNC',
    accessToken,
    lookbackMonths: options.lookbackMonths ?? 6,
    lastSyncedAt: options.lastSyncedAt?.toISOString() ?? null,
  });

  return () => {
    activeWorker?.terminate();
    activeWorker = null;
  };
}

export function cancelGmailSync() {
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }
}
