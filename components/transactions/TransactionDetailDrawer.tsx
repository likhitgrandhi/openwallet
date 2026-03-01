'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Transaction } from '@/lib/db/schema';
import { useTransactionStore, CATEGORIES } from '@/lib/store/useTransactionStore';
import { formatCurrency } from '@/lib/data/seed';
import { CategoryBadge } from './CategoryBadge';
import { cn } from '@/lib/utils';
import { CalendarDays, Tag, Wallet, Ban, Pencil, Check, X } from 'lucide-react';

interface TransactionDetailDrawerProps {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#8A8A8A] mb-1.5">{label}</p>
      {children}
    </div>
  );
}

export function TransactionDetailDrawer({ transaction: tx, open, onClose }: TransactionDetailDrawerProps) {
  const { updateTransaction, deleteTransactions } = useTransactionStore();

  // Local editing state
  const [editingDate, setEditingDate] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [editingCategory, setEditingCategory] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState('');

  useEffect(() => {
    if (tx) {
      const d = tx.date instanceof Date ? tx.date : new Date(tx.date);
      setDateInput(d.toISOString().split('T')[0]);
      setNotesInput(tx.notes || '');
      setEditingDate(false);
      setEditingCategory(false);
      setEditingNotes(false);
    }
  }, [tx?.id]);

  const persist = tx ? (tx.id.startsWith('manual-') || !tx.id.startsWith('mock-')) : false;
  const isExcluded = tx?.excludedFromCalc === true;

  const saveDate = () => {
    if (!tx || !dateInput) return;
    const parsed = new Date(dateInput);
    if (!isNaN(parsed.getTime())) {
      updateTransaction(tx.id, { date: parsed }, persist);
    }
    setEditingDate(false);
  };

  const saveNotes = () => {
    if (!tx) return;
    updateTransaction(tx.id, { notes: notesInput.trim() }, persist);
    setEditingNotes(false);
  };

  const toggleExclude = () => {
    if (!tx) return;
    updateTransaction(tx.id, { excludedFromCalc: !isExcluded }, persist);
  };

  const handleDelete = () => {
    if (!tx) return;
    deleteTransactions([tx.id], persist);
    onClose();
  };

  const txDate = tx ? (tx.date instanceof Date ? tx.date : new Date(tx.date)) : null;
  const formattedDate = txDate?.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) ?? '';

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[400px] p-0 flex flex-col border-l border-[#E4E4E4]"
      >
        <SheetTitle className="sr-only">{tx?.merchant ?? 'Transaction'}</SheetTitle>
        {!tx ? null : (<>
        {/* Header band */}
        <div
          className={cn(
            'px-6 pt-8 pb-6 border-b border-[#E4E4E4]',
            isExcluded && 'opacity-60'
          )}
        >
          {/* Merchant avatar + name */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#F0F0F0] flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-[#525252]">
                {tx.merchant.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[16px] font-semibold text-[#0A0A0A] tracking-[-0.02em] truncate">{tx.merchant}</p>
              {tx.merchantRaw && tx.merchantRaw !== tx.merchant && (
                <p className="text-[11px] text-[#8A8A8A] truncate">{tx.merchantRaw}</p>
              )}
            </div>
          </div>

          {/* Amount */}
          <p
            className={cn(
              'font-numbers text-[32px] font-bold tracking-[-0.03em] leading-none',
              tx.type === 'credit' ? 'text-[#0BAF6B]' : 'text-[#0A0A0A]'
            )}
          >
            {tx.type === 'credit' ? '+' : '−'}{formatCurrency(tx.amount)}
          </p>

          {isExcluded && (
            <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-[#8A8A8A] bg-[#F0F0F0] px-2 py-0.5 rounded-full">
              <Ban className="w-3 h-3" /> Excluded from calculations
            </span>
          )}
        </div>

        {/* Detail fields */}
        <div className="flex-1 overflow-auto px-6 py-5 space-y-5">

          {/* Date — editable */}
          <Field label="Date">
            {editingDate ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="flex-1 text-[13px] font-medium text-[#0A0A0A] border border-[#E4E4E4] rounded-[6px] px-2.5 py-1.5 bg-white focus:outline-none focus:border-[#0A0A0A]"
                  autoFocus
                />
                <button onClick={saveDate} className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#0A0A0A] text-white hover:bg-[#2C2C2C] transition-colors">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setEditingDate(false)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E4E4E4] text-[#525252] hover:bg-[#F7F7F7] transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                className="flex items-center gap-2 group"
                onClick={() => setEditingDate(true)}
              >
                <CalendarDays className="w-3.5 h-3.5 text-[#8A8A8A] shrink-0" />
                <span className="text-[13px] font-medium text-[#0A0A0A] group-hover:text-[#525252] transition-colors">
                  {formattedDate}
                </span>
                <Pencil className="w-3 h-3 text-[#C4C4C4] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </Field>

          {/* Category — editable */}
          <Field label="Category">
            <Popover open={editingCategory} onOpenChange={setEditingCategory}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 group">
                  <Tag className="w-3.5 h-3.5 text-[#8A8A8A] shrink-0" />
                  <CategoryBadge category={tx.category} />
                  <Pencil className="w-3 h-3 text-[#C4C4C4] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1.5 rounded-xl" align="start">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-[#8A8A8A] mb-1.5 px-2">Category</p>
                <div className="max-h-64 overflow-auto">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      className={cn(
                        'w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-[#F7F7F7] transition-colors',
                        cat === tx.category && 'bg-[#F0F0F0] font-medium text-[#0A0A0A]'
                      )}
                      onClick={() => { updateTransaction(tx.id, { category: cat }, persist); setEditingCategory(false); }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </Field>

          {/* Account */}
          <Field label="Account">
            <div className="flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-[#8A8A8A] shrink-0" />
              <span className="text-[13px] font-medium text-[#0A0A0A]">{tx.account}</span>
            </div>
          </Field>

          {/* Notes — editable */}
          <Field label="Notes">
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Add a note…"
                  rows={3}
                  className="w-full text-[13px] text-[#0A0A0A] border border-[#E4E4E4] rounded-[6px] px-2.5 py-1.5 bg-white resize-none focus:outline-none focus:border-[#0A0A0A]"
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) saveNotes(); if (e.key === 'Escape') setEditingNotes(false); }}
                />
                <div className="flex gap-2">
                  <button onClick={saveNotes} className="text-[11px] font-medium text-white bg-[#0A0A0A] px-3 py-1 rounded-[6px] hover:bg-[#2C2C2C] transition-colors">Save</button>
                  <button onClick={() => setEditingNotes(false)} className="text-[11px] font-medium text-[#525252] px-3 py-1 rounded-[6px] border border-[#E4E4E4] hover:bg-[#F7F7F7] transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <button
                className="text-left group flex items-start gap-2 w-full"
                onClick={() => { setNotesInput(tx.notes || ''); setEditingNotes(true); }}
              >
                <Pencil className="w-3.5 h-3.5 text-[#8A8A8A] shrink-0 mt-0.5" />
                <span className={cn('text-[13px] flex-1', tx.notes ? 'text-[#0A0A0A]' : 'text-[#C4C4C4] italic')}>
                  {tx.notes || 'Add a note…'}
                </span>
              </button>
            )}
          </Field>

          {/* Tags */}
          {tx.tags && tx.tags.length > 0 && (
            <Field label="Tags">
              <div className="flex flex-wrap gap-1.5">
                {tx.tags.map((tag) => (
                  <span key={tag} className="text-[11px] font-medium text-[#525252] bg-[#F0F0F0] px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </Field>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-[#E4E4E4] space-y-2">
          {/* Exclude from calculations toggle */}
          <button
            onClick={toggleExclude}
            className={cn(
              'w-full flex items-center gap-2.5 text-[13px] font-medium px-3.5 py-2.5 rounded-[8px] border transition-colors text-left',
              isExcluded
                ? 'border-[#0A0A0A] text-[#0A0A0A] bg-[#F0F0F0] hover:bg-[#E8E8E8]'
                : 'border-[#E4E4E4] text-[#525252] bg-white hover:bg-[#F7F7F7] hover:border-[#C4C4C4]'
            )}
          >
            <Ban className="w-3.5 h-3.5 shrink-0" />
            {isExcluded ? 'Include in calculations' : 'Exclude from calculations'}
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2.5 text-[13px] font-medium text-[#E53E3E] px-3.5 py-2.5 rounded-[8px] border border-[#E53E3E]/20 bg-[#FFF5F5] hover:bg-[#FFF0F0] transition-colors text-left"
          >
            <X className="w-3.5 h-3.5 shrink-0" />
            Delete transaction
          </button>
        </div>
        </>)}
      </SheetContent>
    </Sheet>
  );
}
