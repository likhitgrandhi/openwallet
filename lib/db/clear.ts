import { db } from './schema';

// Wipes every table in IndexedDB and resets all Zustand stores
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', [db.transactions, db.budgets, db.subscriptions, db.syncState], async () => {
    await db.transactions.clear();
    await db.budgets.clear();
    await db.subscriptions.clear();
    await db.syncState.clear();
  });
}
