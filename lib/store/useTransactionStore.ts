'use client';

import { create } from 'zustand';
import { Transaction } from '../db/schema';
import {
  SEED_TRANSACTIONS,
  PREV_SEED_TRANSACTIONS,
  CATEGORIES,
  SAVINGS_CATEGORIES,
  CATEGORY_COLORS,
  CHART_COLORS,
  formatCurrency,
} from '../data/seed';
import * as txDB from '../db/transactions';

export interface CategoryBreakdown {
  category: string;
  amount: number;
  count: number;
  color: string;
  percentage: number;
}

export interface MonthlyStats {
  totalIncome: number;
  totalExpenses: number;
  savings: number;
  savingsRate: number;
  transactionCount: number;
}

interface TransactionFilter {
  month?: string;
  categories?: string[];
  search?: string;
  type?: 'debit' | 'credit' | 'all';
  minAmount?: number;
  maxAmount?: number;
}

interface TransactionStore {
  transactions: Transaction[];
  isLoaded: boolean;
  // Demo mode: load seed data into memory (no DB writes)
  loadSeedData: () => void;
  // Real mode: load from IndexedDB
  loadFromDB: () => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>, persist?: boolean) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>, persist?: boolean) => void;
  deleteTransactions: (ids: string[], persist?: boolean) => void;
  getFilteredTransactions: (filter: TransactionFilter) => Transaction[];
  getMonthlyStats: (month: string) => MonthlyStats;
  getCategoryBreakdown: (month: string) => CategoryBreakdown[];
  getAllMonths: () => string[];
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],
  isLoaded: false,

  loadSeedData: () => {
    const all = [...SEED_TRANSACTIONS, ...PREV_SEED_TRANSACTIONS];
    set({ transactions: all, isLoaded: true });
  },

  loadFromDB: async () => {
    const txs = await txDB.getTransactions();
    set({ transactions: txs, isLoaded: true });
  },

  addTransaction: (tx, persist = false) => {
    const id = `manual-${Date.now()}`;
    const now = new Date();
    const newTx: Transaction = {
      ...tx,
      id,
      merchantRaw: tx.merchant,
      emailId: '',
      rawText: '',
      isRecurring: false,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ transactions: [newTx, ...s.transactions] }));
    if (persist) txDB.addTransaction(newTx).catch(console.error);
  },

  updateTransaction: (id, updates, persist = false) => {
    set((s) => ({
      transactions: s.transactions.map((tx) =>
        tx.id === id ? { ...tx, ...updates, updatedAt: new Date() } : tx
      ),
    }));
    if (persist) txDB.updateTransaction(id, updates).catch(console.error);
  },

  deleteTransactions: (ids, persist = false) => {
    set((s) => ({
      transactions: s.transactions.filter((tx) => !ids.includes(tx.id)),
    }));
    if (persist) txDB.deleteTransactions(ids).catch(console.error);
  },

  getFilteredTransactions: (filter) => {
    const { transactions } = get();
    return transactions
      .filter((tx) => {
        if (filter.month) {
          const txDate = tx.date instanceof Date ? tx.date : new Date(tx.date);
          const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
          if (txMonth !== filter.month) return false;
        }
        if (filter.categories?.length && !filter.categories.includes(tx.category)) return false;
        if (filter.type && filter.type !== 'all' && tx.type !== filter.type) return false;
        if (filter.search) {
          const q = filter.search.toLowerCase();
          if (!tx.merchant.toLowerCase().includes(q) && !tx.notes?.toLowerCase().includes(q)) return false;
        }
        if (filter.minAmount !== undefined && tx.amount < filter.minAmount) return false;
        if (filter.maxAmount !== undefined && tx.amount > filter.maxAmount) return false;
        return true;
      })
      .sort((a, b) => {
        const aDate = a.date instanceof Date ? a.date : new Date(a.date);
        const bDate = b.date instanceof Date ? b.date : new Date(b.date);
        return bDate.getTime() - aDate.getTime();
      });
  },

  getMonthlyStats: (month) => {
    const txs = get().getFilteredTransactions({ month }).filter((t) => !t.excludedFromCalc);
    const totalIncome = txs.filter((t) => t.type === 'credit' && t.category !== 'Transfers').reduce((s, t) => s + t.amount, 0);
    // Savings = actual savings/investment transactions (debit to savings/investment accounts)
    const savings = txs
      .filter((t) => t.type === 'debit' && SAVINGS_CATEGORIES.includes(t.category))
      .reduce((s, t) => s + t.amount, 0);
    // Expenses = all debits excluding savings/investment categories
    const totalExpenses = txs
      .filter((t) => t.type === 'debit' && !SAVINGS_CATEGORIES.includes(t.category))
      .reduce((s, t) => s + t.amount, 0);
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;
    return { totalIncome, totalExpenses, savings, savingsRate, transactionCount: txs.length };
  },

  getCategoryBreakdown: (month) => {
    const txs = get().getFilteredTransactions({ month, type: 'debit' }).filter((t) => !t.excludedFromCalc);
    const total = txs.reduce((s, t) => s + t.amount, 0);
    const map: Record<string, { amount: number; count: number }> = {};
    for (const tx of txs) {
      if (!map[tx.category]) map[tx.category] = { amount: 0, count: 0 };
      map[tx.category].amount += tx.amount;
      map[tx.category].count += 1;
    }
    return Object.entries(map)
      .map(([category, data], i) => ({
        category,
        ...data,
        color: CATEGORY_COLORS[category] || CHART_COLORS[i % CHART_COLORS.length],
        percentage: total > 0 ? (data.amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  },

  getAllMonths: () => {
    const { transactions } = get();
    const months = new Set<string>();
    for (const tx of transactions) {
      const txDate = tx.date instanceof Date ? tx.date : new Date(tx.date);
      months.add(`${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`);
    }
    return Array.from(months).sort().reverse();
  },
}));

export { CATEGORIES, SAVINGS_CATEGORIES, CATEGORY_COLORS, formatCurrency };
