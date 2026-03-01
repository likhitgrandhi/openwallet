'use client';

import { listTransactionEmails } from './client';
import { parseEmail } from '../parsers/index';
import { db } from '../db/schema';
import type { WorkerMessage, SyncOptions } from './sync';

let abortFlag = false;

export function cancelDirectSync() {
  abortFlag = true;
}

export async function runDirectSync(
  accessToken: string,
  options: SyncOptions,
  onMessage: (msg: WorkerMessage) => void
): Promise<void> {
  abortFlag = false;

  // Priority: explicit fromDate > lastSyncedAt (incremental) > lookbackMonths fallback
  const afterDate = options.fromDate
    ? options.fromDate
    : options.lastSyncedAt
    ? new Date(options.lastSyncedAt)
    : new Date(Date.now() - (options.lookbackMonths ?? 6) * 30 * 24 * 60 * 60 * 1000);

  let scanned = 0;
  let parsed = 0;
  const FLUSH_SIZE = 20;
  let batch = [];

  try {
    for await (const email of listTransactionEmails(
      accessToken,
      afterDate,
      (s, t) => {
        scanned = s;
        onMessage({ type: 'PROGRESS', scanned: s, total: t, parsed });
      },
      options.selectedSenders
    )) {
      if (abortFlag) return;

      const tx = parseEmail(email);
      if (tx) {
        batch.push(tx);
        parsed++;

        if (batch.length >= FLUSH_SIZE) {
          await db.transactions.bulkPut(batch);
          onMessage({ type: 'TRANSACTION_BATCH', transactions: [...batch], parsed });
          batch = [];
          // Yield to the browser so the UI can repaint between batches
          await new Promise(r => setTimeout(r, 0));
        }
      }
    }

    if (abortFlag) return;

    // Flush remainder
    if (batch.length > 0) {
      await db.transactions.bulkPut(batch);
      onMessage({ type: 'TRANSACTION_BATCH', transactions: [...batch], parsed });
    }

    await db.syncState.put({
      id: 1,
      lastSyncedAt: new Date(),
      emailsScanned: scanned,
      transactionsParsed: parsed,
    });

    onMessage({ type: 'COMPLETE', totalParsed: parsed, totalScanned: scanned });
  } catch (err) {
    onMessage({
      type: 'ERROR',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
