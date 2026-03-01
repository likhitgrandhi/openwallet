import Dexie, { type Table } from 'dexie';

export interface Transaction {
  id: string;
  date: Date;
  amount: number;
  type: 'debit' | 'credit';
  merchant: string;
  merchantRaw: string;
  category: string;
  subcategory?: string;
  account: string;
  bank: string;
  notes?: string;
  tags?: string[];
  emailId: string;
  rawText: string;
  isRecurring: boolean;
  excludedFromCalc?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  month: string; // "YYYY-MM"
  applyForward: boolean;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  merchant: string;
  logoUrl?: string;
  amount: number;
  currency: 'INR';
  frequency: 'weekly' | 'monthly' | 'annual';
  nextRenewal: Date;
  cancelUrl?: string;
  cancelInstructions?: string;
  isActive: boolean;
  isManual: boolean;
  detectedFrom: string[];
}

export interface SyncState {
  id: 1;
  lastSyncedAt: Date | null;
  emailsScanned: number;
  transactionsParsed: number;
}

class ExpenseDB extends Dexie {
  transactions!: Table<Transaction>;
  budgets!: Table<Budget>;
  subscriptions!: Table<Subscription>;
  syncState!: Table<SyncState>;

  constructor() {
    super('ExpenseManagerDB');
    this.version(1).stores({
      transactions: 'id, date, category, bank, type, merchant',
      budgets: 'id, month, category',
      subscriptions: 'id, merchant, nextRenewal',
      syncState: 'id',
    });
  }
}

export const db = new ExpenseDB();
