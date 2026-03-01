// Web Worker — runs off the main thread
// IndexedDB is accessible in workers; Dexie works here directly.
import { listTransactionEmails } from './client';
import { parseEmail } from '../parsers/index';
import { db } from '../db/schema';
import type { Transaction } from '../db/schema';

interface StartSyncMessage {
  type: 'START_SYNC';
  accessToken: string;
  lookbackMonths: number;
  lastSyncedAt: string | null;
}

self.onmessage = async (event: MessageEvent<StartSyncMessage>) => {
  if (event.data.type !== 'START_SYNC') return;

  const { accessToken, lookbackMonths, lastSyncedAt } = event.data;

  const afterDate = lastSyncedAt
    ? new Date(lastSyncedAt)
    : new Date(Date.now() - lookbackMonths * 30 * 24 * 60 * 60 * 1000);

  let scanned = 0;
  let parsed = 0;
  const FLUSH_SIZE = 25;
  let batch: Transaction[] = [];

  async function flush() {
    if (batch.length === 0) return;
    await db.transactions.bulkPut(batch);
    self.postMessage({ type: 'TRANSACTION_BATCH', transactions: [...batch], parsed });
    batch = [];
  }

  try {
    for await (const email of listTransactionEmails(accessToken, afterDate, (s, t) => {
      scanned = s;
      self.postMessage({ type: 'PROGRESS', scanned: s, total: t, parsed });
    })) {
      const tx = parseEmail(email);
      if (tx) {
        batch.push(tx);
        parsed++;
        if (batch.length >= FLUSH_SIZE) await flush();
      }
    }

    await flush();

    await db.syncState.put({
      id: 1,
      lastSyncedAt: new Date(),
      emailsScanned: scanned,
      transactionsParsed: parsed,
    });

    self.postMessage({ type: 'COMPLETE', totalParsed: parsed, totalScanned: scanned });
  } catch (err) {
    self.postMessage({
      type: 'ERROR',
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
