'use client';

import { useState, useMemo } from 'react';
import { useTransactionStore, CATEGORIES } from '@/lib/store/useTransactionStore';
import { formatCurrency } from '@/lib/data/seed';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Plus, ChevronRight, ArrowUpDown, ChevronDown } from 'lucide-react';
import { AddTransactionForm } from '@/components/transactions/AddTransactionForm';
import { TransactionDetailDrawer } from '@/components/transactions/TransactionDetailDrawer';
import { Transaction } from '@/lib/db/schema';

// ─── Category emoji map ───────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  'Food & Dining':     '🍽️',
  'Auto & Transport':  '🚗',
  'Housing':           '🏠',
  'Shopping':          '🛍️',
  'Subscriptions':     '🔁',
  'Health & Wellness': '❤️',
  'Entertainment':     '🎬',
  'Travel & Vacation': '✈️',
  'Education':         '📚',
  'Investments':       '📈',
  'Income':            '💰',
  'Transfer':          '🔄',
  'Transfers':         '🔄',
  'Personal':          '🔥',
  'Medical':           '💊',
  'Clothing':          '👕',
};

function formatGroupDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatRowDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type SortMode = 'date-desc' | 'amount-desc' | 'amount-asc';

const SORT_LABELS: Record<SortMode, string> = {
  'date-desc':   'Date',
  'amount-desc': 'Amt ↓',
  'amount-asc':  'Amt ↑',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TransactionRow({
  tx,
  isLast,
  editingCategory,
  setEditingCategory,
  updateTransaction,
  onRowClick,
}: {
  tx: Transaction;
  isLast: boolean;
  editingCategory: string | null;
  setEditingCategory: (id: string | null) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  onRowClick: (tx: Transaction) => void;
}) {
  const date = tx.date instanceof Date ? tx.date : new Date(tx.date);
  const emoji = CATEGORY_EMOJI[tx.category] ?? '•';
  const initials = tx.merchant.slice(0, 2).toUpperCase();
  const accountLabel = tx.account ? `${tx.bank || 'Account'} (…${tx.account.slice(-4)})` : tx.bank || 'Account';

  return (
    <div
      onClick={() => onRowClick(tx)}
      className="flex items-center gap-3 px-6 hover:bg-[#F7F7F7] transition-colors cursor-pointer group"
      style={{
        paddingTop: 11,
        paddingBottom: 11,
        borderBottom: isLast ? 'none' : '1px solid #F0F0F0',
      }}
    >
      {/* Avatar */}
      <div
        className="shrink-0 flex items-center justify-center rounded-full"
        style={{ width: 32, height: 32, background: '#F0F0F0', fontSize: 11, fontWeight: 600, color: '#525252' }}
      >
        {initials}
      </div>

      {/* Merchant + category */}
      <div className="flex-1 min-w-0">
        <p
          className="truncate"
          style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', letterSpacing: '-0.01em' }}
        >
          {tx.merchant}
        </p>
        <Popover open={editingCategory === tx.id} onOpenChange={(o) => !o && setEditingCategory(null)}>
          <PopoverTrigger asChild>
            <button
              className="text-left hover:text-[#525252] transition-colors"
              style={{ fontSize: 11, color: '#8A8A8A' }}
              onClick={(e) => { e.stopPropagation(); setEditingCategory(tx.id); }}
            >
              {emoji} {tx.category}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1.5 rounded-xl" align="start">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={cn(
                  'w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-[#f5f5f5] transition-colors',
                  cat === tx.category && 'bg-[#f5f5f5] text-[#01291e] font-medium'
                )}
                onClick={() => { updateTransaction(tx.id, { category: cat }); setEditingCategory(null); }}
              >
                {CATEGORY_EMOJI[cat] ?? '•'} {cat}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {/* Account */}
      <span
        className="shrink-0 hidden sm:block truncate max-w-[120px]"
        style={{ fontSize: 11, color: '#8A8A8A' }}
      >
        {accountLabel}
      </span>

      {/* Date */}
      <span
        className="shrink-0"
        style={{ fontSize: 12, color: '#8A8A8A', fontVariantNumeric: 'tabular-nums', minWidth: 48, textAlign: 'right' }}
      >
        {formatRowDate(date)}
      </span>

      {/* Amount */}
      <span
        className="font-numbers shrink-0"
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: tx.type === 'credit' ? '#0BAF6B' : '#0A0A0A',
          fontVariantNumeric: 'tabular-nums',
          fontFeatureSettings: '"tnum"',
          minWidth: 68,
          textAlign: 'right',
        }}
      >
        {tx.type === 'credit' ? '+' : ''}{formatCurrency(tx.amount)}
      </span>

      {/* Chevron */}
      <ChevronRight
        size={13}
        className="shrink-0 transition-opacity opacity-0 group-hover:opacity-100"
        style={{ color: '#C4C4C4' }}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TransactionsCardProps {
  month: string;
}

export function TransactionsCard({ month }: TransactionsCardProps) {
  const { getFilteredTransactions, updateTransaction } = useTransactionStore();
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('date-desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);

  const raw = getFilteredTransactions({ month }).slice(0, 25);

  const transactions = useMemo(() => {
    const sorted = [...raw];
    if (sortMode === 'amount-desc') sorted.sort((a, b) => b.amount - a.amount);
    else if (sortMode === 'amount-asc') sorted.sort((a, b) => a.amount - b.amount);
    return sorted;
  }, [raw, sortMode]);

  // Group by date (only in date-desc mode)
  const groups = useMemo(() => {
    if (sortMode !== 'date-desc') return null;
    const map = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const d = tx.date instanceof Date ? tx.date : new Date(tx.date);
      const key = d.toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tx);
    }
    return map;
  }, [transactions, sortMode]);

  return (
    <div className="bento-card flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4">
        <p style={{ fontSize: 16, fontWeight: 600, color: '#0A0A0A', letterSpacing: '-0.02em' }}>
          Transactions
        </p>

        <div className="flex items-center" style={{ gap: 8 }}>
          {/* Sort button */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border transition-colors hover:bg-[#F7F7F7]"
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: '#525252',
                borderColor: '#E4E4E4',
                padding: '6px 10px',
              }}
            >
              <ArrowUpDown size={11} strokeWidth={2} />
              Sort
              <ChevronDown size={11} strokeWidth={2} />
            </button>
            {showSortMenu && (
              <div
                className="absolute right-0 top-full mt-1 rounded-xl border bg-white shadow-lg z-50 overflow-hidden"
                style={{ borderColor: '#E4E4E4', minWidth: 140 }}
              >
                {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                  <button
                    key={mode}
                    className="w-full text-left px-3 py-2.5 hover:bg-[#F7F7F7] transition-colors"
                    style={{
                      fontSize: 12,
                      fontWeight: sortMode === mode ? 600 : 400,
                      color: sortMode === mode ? '#0A0A0A' : '#525252',
                    }}
                    onClick={() => { setSortMode(mode); setShowSortMenu(false); }}
                  >
                    {sortMode === mode && <span className="mr-1.5">✓</span>}
                    {SORT_LABELS[mode]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: '#E4E4E4' }} />

          {/* Add button */}
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-lg transition-colors"
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: '#ffffff',
              background: '#00A4FF',
              padding: '6px 10px',
            }}
          >
            <Plus size={11} strokeWidth={2} />
            Add
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div
        className="grid px-6 pb-2.5"
        style={{ gridTemplateColumns: '1fr auto auto auto auto' }}
      >
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8A8A' }}>Merchant</span>
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8A8A', paddingRight: 60 }} className="hidden sm:block">Account</span>
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8A8A', paddingRight: 12 }}>Date</span>
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8A8A', textAlign: 'right', paddingRight: 24 }}>Amount</span>
        <span />
      </div>

      {/* Hard separator */}
      <div style={{ borderTop: '1.5px solid #E4E4E4' }} />

      {/* Transaction rows */}
      <div className="flex-1 overflow-auto">
        {transactions.length === 0 ? (
          <p style={{ fontSize: 13, color: '#8A8A8A', textAlign: 'center', padding: '32px 0' }}>
            No transactions this month
          </p>
        ) : groups ? (
          Array.from(groups.entries()).map(([dateKey, txs]) => {
            const date = txs[0].date instanceof Date ? txs[0].date : new Date(txs[0].date);
            const dailyTotal = txs.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
            return (
              <div key={dateKey}>
                {/* Date group header */}
                <div
                  className="flex items-center justify-between px-6"
                  style={{ paddingTop: 8, paddingBottom: 8, background: '#F7F7F7', borderBottom: '1px solid #F0F0F0' }}
                >
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#525252' }}>
                    {formatGroupDate(date)}
                  </span>
                  <span
                    className="font-numbers"
                    style={{ fontSize: 12, fontWeight: 500, color: '#525252', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatCurrency(dailyTotal)}
                  </span>
                </div>

                {txs.map((tx, i) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    isLast={i === txs.length - 1}
                    editingCategory={editingCategory}
                    setEditingCategory={setEditingCategory}
                    updateTransaction={updateTransaction}
                    onRowClick={setDetailTx}
                  />
                ))}
              </div>
            );
          })
        ) : (
          transactions.map((tx, i) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              isLast={i === transactions.length - 1}
              editingCategory={editingCategory}
              setEditingCategory={setEditingCategory}
              updateTransaction={updateTransaction}
              onRowClick={setDetailTx}
            />
          ))
        )}
      </div>

      <AddTransactionForm open={showAdd} onClose={() => setShowAdd(false)} defaultMonth={month} />

      <TransactionDetailDrawer
        transaction={detailTx}
        open={detailTx !== null}
        onClose={() => setDetailTx(null)}
      />
    </div>
  );
}
