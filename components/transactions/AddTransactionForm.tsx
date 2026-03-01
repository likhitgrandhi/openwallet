'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTransactionStore, CATEGORIES } from '@/lib/store/useTransactionStore';
import { Transaction } from '@/lib/db/schema';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddTransactionFormProps {
  open: boolean;
  onClose: () => void;
  defaultMonth?: string;
}

export function AddTransactionForm({ open, onClose, defaultMonth: _defaultMonth }: AddTransactionFormProps) {
  const { addTransaction } = useTransactionStore();
  const [form, setForm] = useState({
    merchant: '', amount: '', type: 'debit' as 'debit' | 'credit',
    category: 'Other', date: new Date().toISOString().split('T')[0],
    account: 'Manual', notes: '',
  });

  if (!open || typeof document === 'undefined') return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.merchant || !form.amount) return;
    addTransaction({
      merchant: form.merchant, merchantRaw: form.merchant,
      amount: parseFloat(form.amount), type: form.type,
      category: form.category, date: new Date(form.date),
      account: form.account, bank: 'Manual', notes: form.notes,
    } as Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>, true);
    setForm({ merchant: '', amount: '', type: 'debit', category: 'Other', date: new Date().toISOString().split('T')[0], account: 'Manual', notes: '' });
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-start justify-end"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative z-10 flex flex-col h-full bg-white border-l border-[#E4E4E4]"
        style={{ width: 360, boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E4E4E4]">
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', letterSpacing: '-0.02em' }}>
            Add Transaction
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-[#F0F0F0]"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} color="#8A8A8A" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto px-6 py-5 gap-5">

          {/* Merchant */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 11, fontWeight: 500, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Merchant
            </label>
            <input
              placeholder="e.g. Swiggy"
              value={form.merchant}
              onChange={(e) => setForm((f) => ({ ...f, merchant: e.target.value }))}
              required
              style={{
                width: '100%', padding: '9px 12px', border: '1.5px solid #E4E4E4',
                borderRadius: 8, fontSize: 14, color: '#0A0A0A', background: '#fff',
                outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#0A0A0A')}
              onBlur={(e) => (e.target.style.borderColor = '#E4E4E4')}
            />
          </div>

          {/* Amount + Type row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 11, fontWeight: 500, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Amount (₹)
              </label>
              <input
                type="number"
                placeholder="0"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                required
                min="0"
                style={{
                  width: '100%', padding: '9px 12px', border: '1.5px solid #E4E4E4',
                  borderRadius: 8, fontSize: 14, color: '#0A0A0A', background: '#fff',
                  outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#0A0A0A')}
                onBlur={(e) => (e.target.style.borderColor = '#E4E4E4')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 11, fontWeight: 500, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Type
              </label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as 'debit' | 'credit' }))}>
                <SelectTrigger
                  style={{
                    border: '1.5px solid #E4E4E4', borderRadius: 8, fontSize: 14,
                    color: '#0A0A0A', background: '#fff', height: 'auto', padding: '9px 12px',
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Expense</SelectItem>
                  <SelectItem value="credit">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 11, fontWeight: 500, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Category
            </label>
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
              <SelectTrigger
                style={{
                  border: '1.5px solid #E4E4E4', borderRadius: 8, fontSize: 14,
                  color: '#0A0A0A', background: '#fff', height: 'auto', padding: '9px 12px',
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 11, fontWeight: 500, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Date
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              style={{
                width: '100%', padding: '9px 12px', border: '1.5px solid #E4E4E4',
                borderRadius: 8, fontSize: 14, color: '#0A0A0A', background: '#fff',
                outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#0A0A0A')}
              onBlur={(e) => (e.target.style.borderColor = '#E4E4E4')}
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 11, fontWeight: 500, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Notes
            </label>
            <input
              placeholder="Optional note"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              style={{
                width: '100%', padding: '9px 12px', border: '1.5px solid #E4E4E4',
                borderRadius: 8, fontSize: 14, color: '#0A0A0A', background: '#fff',
                outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#0A0A0A')}
              onBlur={(e) => (e.target.style.borderColor = '#E4E4E4')}
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions */}
          <div className="flex gap-2.5 pt-2 border-t border-[#E4E4E4] -mx-6 px-6 pb-1 mt-2">
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '10px 16px', border: '1.5px solid #C4C4C4',
                borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#0A0A0A',
                background: 'transparent', cursor: 'pointer', transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F7F7F7'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 1, padding: '10px 16px', border: '1.5px solid #00A4FF',
                borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#fff',
                background: '#00A4FF', cursor: 'pointer', transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#0090E0'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#00A4FF'; }}
            >
              Add Transaction
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
