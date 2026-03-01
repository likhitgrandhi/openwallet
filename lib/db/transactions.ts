import { db, type Transaction } from './schema';
import { CATEGORY_COLORS, CHART_COLORS, SAVINGS_CATEGORIES } from '../data/seed';

export interface TransactionFilter {
  month?: string;
  categories?: string[];
  type?: 'debit' | 'credit' | 'all';
  search?: string;
  minAmount?: number;
  maxAmount?: number;
}

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

function txMatchesFilter(tx: Transaction, filter: TransactionFilter): boolean {
  if (filter.month) {
    const txMonth = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
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
}

export async function getTransactions(filter?: TransactionFilter): Promise<Transaction[]> {
  const all = await db.transactions.orderBy('date').reverse().toArray();
  if (!filter) return all;
  return all.filter(tx => txMatchesFilter(tx, filter));
}

export async function addTransactions(txs: Transaction[]): Promise<void> {
  // bulkPut uses the primary key (id) to upsert — natural deduplication
  await db.transactions.bulkPut(txs);
}

export async function addTransaction(tx: Transaction): Promise<void> {
  await db.transactions.put(tx);
}

export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
  await db.transactions.update(id, { ...updates, updatedAt: new Date() });
}

export async function deleteTransactions(ids: string[]): Promise<void> {
  await db.transactions.bulkDelete(ids);
}

export async function getTransactionCount(): Promise<number> {
  return db.transactions.count();
}

export async function getAllMonths(): Promise<string[]> {
  const all = await db.transactions.toArray();
  const months = new Set<string>();
  for (const tx of all) {
    months.add(`${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`);
  }
  return Array.from(months).sort().reverse();
}

export async function getMonthlyStats(month: string): Promise<MonthlyStats> {
  const txs = await getTransactions({ month });
  const totalIncome = txs.filter(t => t.type === 'credit' && t.category !== 'Transfers').reduce((s, t) => s + t.amount, 0);
  // Savings = actual savings/investment transactions
  const savings = txs
    .filter(t => t.type === 'debit' && SAVINGS_CATEGORIES.includes(t.category))
    .reduce((s, t) => s + t.amount, 0);
  // Expenses = all debits excluding savings/investment categories
  const totalExpenses = txs
    .filter(t => t.type === 'debit' && !SAVINGS_CATEGORIES.includes(t.category))
    .reduce((s, t) => s + t.amount, 0);
  return {
    totalIncome,
    totalExpenses,
    savings,
    savingsRate: totalIncome > 0 ? (savings / totalIncome) * 100 : 0,
    transactionCount: txs.length,
  };
}

export async function getCategoryBreakdown(month: string): Promise<CategoryBreakdown[]> {
  const txs = await getTransactions({ month, type: 'debit' });
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
}

export async function seedTransactions(txs: Transaction[]): Promise<void> {
  await db.transactions.bulkPut(txs);
}
