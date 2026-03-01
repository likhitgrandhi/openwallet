'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoryBadge } from './CategoryBadge';
import { useTransactionStore, CATEGORIES } from '@/lib/store/useTransactionStore';
import { formatCurrency } from '@/lib/data/seed';
import { Transaction } from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Trash2, Plus, Search, SlidersHorizontal, Ban } from 'lucide-react';
import { AddTransactionForm } from './AddTransactionForm';
import { Input } from '@/components/ui/input';
import { TransactionDetailDrawer } from './TransactionDetailDrawer';

const PAGE_SIZE = 20;

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

interface TransactionTableProps {
  month?: string;
}

export function TransactionTable({ month }: TransactionTableProps) {
  const { getFilteredTransactions, updateTransaction, deleteTransactions } = useTransactionStore();

  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingMerchant, setEditingMerchant] = useState<string | null>(null);
  const [merchantInputValue, setMerchantInputValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'debit' | 'credit'>('all');
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);

  const allTransactions = getFilteredTransactions({
    month,
    categories: selectedCategories.length ? selectedCategories : undefined,
    search: search || undefined,
    type: typeFilter === 'all' ? undefined : typeFilter,
  });

  const totalPages = Math.ceil(allTransactions.length / PAGE_SIZE);
  const transactions = allTransactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === transactions.length ? new Set() : new Set(transactions.map((t) => t.id)));
  };

  const startMerchantEdit = (tx: Transaction) => {
    setEditingMerchant(tx.id);
    setMerchantInputValue(tx.merchant);
  };

  const saveMerchantEdit = (id: string) => {
    if (merchantInputValue.trim()) updateTransaction(id, { merchant: merchantInputValue.trim() });
    setEditingMerchant(null);
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#ABABAB]" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 h-8 text-sm border-[#E8E8E6] bg-white focus-visible:ring-[#0A0A0A]"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="w-28 h-8 text-xs border-[#E8E8E6] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="debit">Expenses</SelectItem>
            <SelectItem value="credit">Income</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-colors',
            showFilters || selectedCategories.length
              ? 'border-[#0A0A0A] text-[#0A0A0A] bg-[#F0F0F0]'
              : 'border-[#E8E8E6] text-[#6B6B6B] bg-white hover:bg-[#F7F7F5]'
          )}
        >
          <SlidersHorizontal className="w-3 h-3" />
          Filters {selectedCategories.length > 0 && `· ${selectedCategories.length}`}
        </button>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-white hover:opacity-90 transition-opacity"
          style={{ background: '#00A4FF' }}
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      {/* Category filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategories((prev) =>
                  prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
                );
                setPage(0);
              }}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                selectedCategories.includes(cat)
                  ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                  : 'bg-white text-[#6B6B6B] border-[#E8E8E6] hover:border-[#ABABAB]'
              )}
            >
              {cat}
            </button>
          ))}
          {selectedCategories.length > 0 && (
            <button
              onClick={() => setSelectedCategories([])}
              className="px-2.5 py-1 rounded-full text-xs text-[#ABABAB] hover:text-[#6B6B6B]"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 mb-3 px-4 py-2.5 rounded-xl bg-[#F0F0F0] border border-[#E4E4E4]">
          <span className="text-xs font-medium text-[#0A0A0A]">{selectedIds.size} selected</span>
          <button
            onClick={() => { deleteTransactions(Array.from(selectedIds)); setSelectedIds(new Set()); }}
            className="flex items-center gap-1 text-xs text-[#E53E3E] hover:underline"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
          <button className="text-xs text-[#ABABAB] ml-auto hover:text-[#6B6B6B]" onClick={() => setSelectedIds(new Set())}>
            Cancel
          </button>
        </div>
      )}

      {/* Table */}
      {transactions.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm text-[#9E9E9E] mb-2">No transactions found</p>
          <button onClick={() => setShowAddForm(true)} className="text-xs text-[#0A0A0A] hover:underline">
            Add one manually
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl card-shadow overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-[#F0F0EE]">
            <Checkbox
              checked={selectedIds.size === transactions.length && transactions.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#ABABAB]">Merchant</span>
            <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#ABABAB]">Category</span>
            <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#ABABAB]">Account</span>
            <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#ABABAB]">Date</span>
            <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#ABABAB] text-right">Amount</span>
          </div>

          {transactions.map((tx, i) => (
            <div
              key={tx.id}
              className={cn(
                'grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5',
                i < transactions.length - 1 && 'border-b border-[#F7F7F5]',
                'hover:bg-[#FAFAFA] transition-colors',
                tx.excludedFromCalc && 'opacity-50'
              )}
            >
              {/* Stop row-click when interacting with checkbox */}
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={selectedIds.has(tx.id)} onCheckedChange={() => toggleSelect(tx.id)} />
              </div>

              {/* Merchant */}
              <div className="flex items-center gap-2.5 min-w-0 cursor-pointer" onClick={() => setDetailTx(tx)}>
                <div className="w-6 h-6 rounded-full bg-[#F0F0EE] flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-semibold text-[#6B6B6B]">
                    {tx.merchant.charAt(0).toUpperCase()}
                  </span>
                </div>
                {editingMerchant === tx.id ? (
                  <Input
                    autoFocus
                    value={merchantInputValue}
                    onChange={(e) => setMerchantInputValue(e.target.value)}
                    onBlur={() => saveMerchantEdit(tx.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveMerchantEdit(tx.id);
                      if (e.key === 'Escape') setEditingMerchant(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-6 text-sm py-0 border-[#E8E8E6] w-36"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <button
                      className="text-sm text-[#1A1A1A] hover:text-[#525252] text-left truncate"
                      onClick={(e) => { e.stopPropagation(); startMerchantEdit(tx); }}
                    >
                      {tx.merchant}
                    </button>
                    {tx.excludedFromCalc && (
                      <span title="Excluded from calculations"><Ban className="w-3 h-3 text-[#8A8A8A] shrink-0" /></span>
                    )}
                  </div>
                )}
              </div>

              {/* Category */}
              <div onClick={(e) => e.stopPropagation()}>
                <Popover
                  open={editingCategory === tx.id}
                  onOpenChange={(open) => !open && setEditingCategory(null)}
                >
                  <PopoverTrigger asChild>
                    <button onClick={() => setEditingCategory(tx.id)}>
                      <CategoryBadge category={tx.category} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-1.5 rounded-xl" align="start">
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-[#ABABAB] mb-1.5 px-2">Category</p>
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        className={cn(
                          'w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-[#F7F7F5] transition-colors',
                          cat === tx.category && 'bg-[#F0F0F0] text-[#0A0A0A] font-medium'
                        )}
                        onClick={() => { updateTransaction(tx.id, { category: cat }); setEditingCategory(null); }}
                      >
                        {cat}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>

              <span
                className="text-xs text-[#9E9E9E] truncate max-w-[100px] cursor-pointer"
                onClick={() => setDetailTx(tx)}
              >
                {tx.account}
              </span>
              <span
                className="text-xs text-[#9E9E9E] tabular-nums whitespace-nowrap cursor-pointer"
                onClick={() => setDetailTx(tx)}
              >
                {formatDate(tx.date instanceof Date ? tx.date : new Date(tx.date))}
              </span>
              <span
                className={cn(
                  'text-sm font-medium tabular-nums text-right whitespace-nowrap cursor-pointer',
                  tx.type === 'credit' ? 'text-[#0BAF6B]' : 'text-[#1A1A1A]'
                )}
                onClick={() => setDetailTx(tx)}
              >
                {tx.type === 'credit' ? '+' : '−'}{formatCurrency(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-xs text-[#ABABAB]">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, allTransactions.length)} of {allTransactions.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E8E8E6] text-[#6B6B6B] hover:bg-[#F7F7F5] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-[#6B6B6B] px-2">{page + 1} / {totalPages}</span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E8E8E6] text-[#6B6B6B] hover:bg-[#F7F7F5] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <AddTransactionForm open={showAddForm} onClose={() => setShowAddForm(false)} defaultMonth={month} />

      <TransactionDetailDrawer
        transaction={detailTx}
        open={detailTx !== null}
        onClose={() => setDetailTx(null)}
      />
    </div>
  );
}
