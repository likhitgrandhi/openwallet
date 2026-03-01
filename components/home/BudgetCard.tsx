'use client';

import { useState } from 'react';
import { useBudgetStore } from '@/lib/store/useBudgetStore';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { formatCurrency } from '@/lib/data/seed';
import { CATEGORIES } from '@/lib/store/useTransactionStore';
import { cn } from '@/lib/utils';
import {
  UtensilsCrossed, Car, Home, ShoppingBag, RefreshCw, Heart, Tv,
  Plane, BookOpen, TrendingUp, Plus, X, Check, Pencil, Trash2,
  type LucideIcon,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BudgetCardProps {
  month: string;
}

interface CategoryTheme {
  bar: string;
  iconBg: string;
  iconFg: string;
  icon: LucideIcon;
}

const CATEGORY_THEME: Record<string, CategoryTheme> = {
  'Food & Dining':     { bar: '#8c6a42', iconBg: '#f5ede0', iconFg: '#8c6a42', icon: UtensilsCrossed },
  'Auto & Transport':  { bar: '#5a8f9a', iconBg: '#e5f0f3', iconFg: '#5a8f9a', icon: Car },
  'Housing':           { bar: '#0A0A0A', iconBg: '#F0F0F0', iconFg: '#0A0A0A', icon: Home },
  'Shopping':          { bar: '#d4788a', iconBg: '#fae8ec', iconFg: '#d4788a', icon: ShoppingBag },
  'Subscriptions':     { bar: '#5b5ea8', iconBg: '#eaeaf5', iconFg: '#5b5ea8', icon: RefreshCw },
  'Health & Wellness': { bar: '#0BAF6B', iconBg: '#EDFCF5', iconFg: '#0BAF6B', icon: Heart },
  'Entertainment':     { bar: '#7b6cbb', iconBg: '#f0ecfb', iconFg: '#7b6cbb', icon: Tv },
  'Travel & Vacation': { bar: '#5a8f9a', iconBg: '#e5f0f3', iconFg: '#5a8f9a', icon: Plane },
  'Education':         { bar: '#8c6a42', iconBg: '#faf4e5', iconFg: '#8c6a42', icon: BookOpen },
  'Investments':       { bar: '#0BAF6B', iconBg: '#EDFCF5', iconFg: '#0BAF6B', icon: TrendingUp },
};

const FALLBACK_COLORS = ['#0A0A0A', '#0BAF6B', '#5a8f9a', '#d4788a', '#5b5ea8', '#8c6a42', '#7b6cbb'];

function ProgressBar({ pct, color, isOver }: { pct: number; color: string; isOver: boolean }) {
  const clampedPct = Math.min(pct, 100);
  const fillColor = isOver ? '#E53E3E' : color;
  return (
    <div className="relative rounded-full overflow-hidden" style={{ height: 4, background: '#F0F0F0' }}>
      {!isOver && clampedPct < 100 && (
        <div
          className="absolute inset-y-0"
          style={{
            left: `${clampedPct}%`, right: 0,
            background: `repeating-linear-gradient(90deg, ${fillColor}40 0px, ${fillColor}40 4px, transparent 4px, transparent 8px)`,
          }}
        />
      )}
      <div
        className="absolute inset-y-0 left-0 transition-all duration-500"
        style={{ width: `${clampedPct}%`, background: fillColor, borderRadius: clampedPct >= 100 ? 999 : '999px 0 0 999px' }}
      />
    </div>
  );
}

export function BudgetCard({ month }: BudgetCardProps) {
  const { getBudgetsForMonth, setBudget, deleteBudget } = useBudgetStore();
  const { getCategoryBreakdown, getFilteredTransactions } = useTransactionStore();

  const [showAdd, setShowAdd] = useState(false);
  const [addCategory, setAddCategory] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const budgets = getBudgetsForMonth(month);
  const breakdown = getCategoryBreakdown(month);
  const spentMap = Object.fromEntries(breakdown.map((b) => [b.category, b.amount]));

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const allDebits = getFilteredTransactions({ month, type: 'debit' });
  const totalSpent = allDebits.reduce((s, tx) => s + tx.amount, 0);
  const totalPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const totalIsOver = totalSpent > totalBudget;

  const budgetedCategories = new Set(budgets.map((b) => b.category));
  const everythingElseSpent = breakdown
    .filter((b) => !budgetedCategories.has(b.category))
    .reduce((s, b) => s + b.amount, 0);

  const availableCategories = CATEGORIES.filter((c) => !budgetedCategories.has(c));

  const handleAddBudget = () => {
    const amt = parseFloat(addAmount);
    if (!addCategory || isNaN(amt) || amt <= 0) return;
    setBudget(addCategory, amt, month, true, true);
    setAddCategory('');
    setAddAmount('');
    setShowAdd(false);
  };

  const handleSaveEdit = (budgetId: string, category: string) => {
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) return;
    setBudget(category, amt, month, true, true);
    setEditingId(null);
  };

  const rows = [
    ...budgets.map((budget, i) => {
      const spent = spentMap[budget.category] || 0;
      const pct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      const theme = CATEGORY_THEME[budget.category];
      const fallbackColor = FALLBACK_COLORS[i % FALLBACK_COLORS.length];
      return {
        id: budget.id,
        category: budget.category,
        spent,
        budget: budget.amount,
        pct,
        color: theme?.bar ?? fallbackColor,
        iconBg: theme?.iconBg ?? '#F0F0F0',
        iconFg: theme?.iconFg ?? '#525252',
        Icon: theme?.icon ?? (Plus as LucideIcon),
      };
    }),
    ...(everythingElseSpent > 0 ? [{
      id: 'everything-else',
      category: 'Everything Else',
      spent: everythingElseSpent,
      budget: 0,
      pct: 50,
      color: '#8A8A8A',
      iconBg: '#F0F0F0',
      iconFg: '#8A8A8A',
      Icon: Plus as LucideIcon,
    }] : []),
  ];

  return (
    <div className="bento-card flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <p style={{ fontSize: 16, fontWeight: 600, color: '#0A0A0A', letterSpacing: '-0.02em' }}>Budget</p>
        <button
          onClick={() => { setShowAdd((v) => !v); setAddCategory(''); setAddAmount(''); }}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-[#F0F0F0]"
          title="Add budget"
        >
          <Plus size={15} strokeWidth={2} color="#525252" />
        </button>
      </div>

      <div style={{ borderTop: '1.5px solid #E4E4E4', marginLeft: 24, marginRight: 24 }} />

      <div className="flex flex-col flex-1 overflow-auto px-6 py-4" style={{ gap: 0 }}>

        {/* Add budget form */}
        {showAdd && (
          <div className="mb-4 p-3 rounded-[10px] border border-[#E4E4E4] bg-[#F7F7F7] space-y-2.5">
            <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#8A8A8A]">New Budget</p>
            <Select value={addCategory} onValueChange={setAddCategory}>
              <SelectTrigger className="h-8 text-xs border-[#E4E4E4] bg-white">
                <SelectValue placeholder="Select category…" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#8A8A8A]">₹</span>
                <input
                  type="number"
                  placeholder="Amount"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddBudget(); if (e.key === 'Escape') setShowAdd(false); }}
                  className="w-full pl-6 pr-2.5 py-1.5 text-[12px] font-medium text-[#0A0A0A] border border-[#E4E4E4] rounded-[6px] bg-white focus:outline-none focus:border-[#0A0A0A]"
                  autoFocus
                />
              </div>
              <button
                onClick={handleAddBudget}
                className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-[#0A0A0A] text-white hover:bg-[#2C2C2C] transition-colors"
              >
                <Check size={13} />
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#E4E4E4] text-[#525252] hover:bg-white transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Total budget summary row */}
        {totalBudget > 0 && (
          <div className="pb-4" style={{ borderBottom: '1px solid #F0F0F0' }}>
            <div className="flex items-baseline justify-between mb-2">
              <span style={{ fontSize: 12, fontWeight: 500, color: '#0A0A0A', letterSpacing: '-0.01em' }}>Total Budget</span>
              <div className="flex items-baseline gap-1">
                <span className="font-numbers" style={{ fontSize: 13, fontWeight: 600, color: totalIsOver ? '#E53E3E' : '#0A0A0A', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(totalSpent)}
                </span>
                <span style={{ fontSize: 11, color: '#8A8A8A' }}>/ {formatCurrency(totalBudget)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1"><ProgressBar pct={totalPct} color="#0A0A0A" isOver={totalIsOver} /></div>
              <span className="font-numbers" style={{ fontSize: 11, fontWeight: 600, color: totalIsOver ? '#E53E3E' : '#8A8A8A', minWidth: 38, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {totalPct.toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* Per-category rows */}
        {rows.map(({ id, category, spent, budget, pct, color, iconBg, iconFg, Icon }) => {
          const isOver = budget > 0 && spent > budget;
          const displayPct = budget > 0 ? pct : 50;
          const isEditing = editingId === id;

          return (
            <div key={id} className="py-3.5 group" style={{ borderBottom: '1px solid #F0F0F0' }}>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 26, height: 26, background: iconBg }}>
                  <Icon size={12} strokeWidth={1.5} style={{ color: iconFg }} />
                </div>
                <span className="flex-1 truncate" style={{ fontSize: 12, fontWeight: 500, color: '#0A0A0A', letterSpacing: '-0.01em' }}>
                  {category}
                </span>

                {isEditing ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-[#8A8A8A]">₹</span>
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(id, category); if (e.key === 'Escape') setEditingId(null); }}
                        className="w-24 pl-5 pr-2 py-0.5 text-[11px] font-medium text-[#0A0A0A] border border-[#E4E4E4] rounded-[5px] bg-white focus:outline-none focus:border-[#0A0A0A]"
                        autoFocus
                      />
                    </div>
                    <button onClick={() => handleSaveEdit(id, category)} className="w-6 h-6 flex items-center justify-center rounded-[5px] bg-[#0A0A0A] text-white hover:bg-[#2C2C2C]"><Check size={11} /></button>
                    <button onClick={() => setEditingId(null)} className="w-6 h-6 flex items-center justify-center rounded-[5px] border border-[#E4E4E4] text-[#525252] hover:bg-[#F7F7F7]"><X size={11} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex items-baseline gap-1">
                      <span className="font-numbers" style={{ fontSize: 12, fontWeight: 500, color: isOver ? '#E53E3E' : '#0A0A0A', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(spent)}
                      </span>
                      {budget > 0 && <span style={{ fontSize: 11, color: '#8A8A8A' }}>/ {formatCurrency(budget)}</span>}
                    </div>
                    {category !== 'Everything Else' && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                        <button
                          onClick={() => { setEditingId(id); setEditAmount(String(budget)); }}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#F0F0F0] text-[#8A8A8A] hover:text-[#0A0A0A] transition-colors"
                        >
                          <Pencil size={10} />
                        </button>
                        <button
                          onClick={() => deleteBudget(id, true)}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#FFF5F5] text-[#8A8A8A] hover:text-[#E53E3E] transition-colors"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pl-[38px]">
                <div className="flex-1"><ProgressBar pct={displayPct} color={color} isOver={isOver} /></div>
                <span className="font-numbers" style={{ fontSize: 10, fontWeight: 600, color: isOver ? '#E53E3E' : '#8A8A8A', minWidth: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {budget > 0 ? `${pct.toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>
          );
        })}

        {budgets.length === 0 && !showAdd && (
          <div className="text-center py-6">
            <p style={{ fontSize: 13, color: '#8A8A8A', marginBottom: 8 }}>No budgets set</p>
            <button
              onClick={() => setShowAdd(true)}
              className="text-[12px] font-medium text-[#0A0A0A] border border-[#E4E4E4] rounded-[6px] px-3 py-1.5 hover:bg-[#F7F7F7] transition-colors"
            >
              + Add first budget
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
