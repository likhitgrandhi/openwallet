'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/data/seed';
import { useGoalStore, Goal } from '@/lib/store/useGoalStore';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { SAVINGS_CATEGORIES } from '@/lib/data/seed';
import { cn } from '@/lib/utils';
import { Plus, X, Check, Pencil, Trash2 } from 'lucide-react';

interface GoalsCardProps {
  month: string;
  onAdd?: () => void;
}

function GoalRow({
  goal,
  isLast,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pct = goal.target > 0 ? Math.min((goal.saved / goal.target) * 100, 100) : 0;
  const isComplete = pct >= 100;
  const remaining = goal.target - goal.saved;

  return (
    <div
      className="py-4 group"
      style={{ borderBottom: isLast ? 'none' : '1px solid #F0F0F0' }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {isComplete && (
            <span className="shrink-0 flex items-center justify-center rounded-full" style={{ width: 16, height: 16, background: '#EDFCF5' }}>
              <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                <path d="M1 3.5L3.2 5.8L8 1" stroke="#0BAF6B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
          <span className="truncate" style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', letterSpacing: '-0.01em' }}>
            {goal.label}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className="font-numbers"
            style={{ fontSize: 11, fontWeight: 600, color: isComplete ? '#0BAF6B' : '#525252', background: isComplete ? '#EDFCF5' : '#F0F0F0', padding: '2px 7px', borderRadius: 100, fontVariantNumeric: 'tabular-nums' }}
          >
            {pct.toFixed(0)}%
          </span>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ml-1">
            <button onClick={onEdit} className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#F0F0F0] text-[#8A8A8A] hover:text-[#0A0A0A] transition-colors">
              <Pencil size={10} />
            </button>
            <button onClick={onDelete} className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#FFF5F5] text-[#8A8A8A] hover:text-[#E53E3E] transition-colors">
              <Trash2 size={10} />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-full overflow-hidden mb-2" style={{ height: 4, background: '#F0F0F0' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: isComplete ? '#0BAF6B' : '#0A0A0A' }} />
      </div>

      <div className="flex items-baseline justify-between">
        <span style={{ fontSize: 11, color: '#8A8A8A' }}>
          {isComplete ? 'Goal reached' : `${formatCurrency(remaining)} remaining`}
        </span>
        <div className="flex items-baseline gap-1">
          <span className="font-numbers" style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(goal.saved)}
          </span>
          <span style={{ fontSize: 11, color: '#8A8A8A' }}>/ {formatCurrency(goal.target)}</span>
        </div>
      </div>
    </div>
  );
}

export function GoalsCard({ month }: GoalsCardProps) {
  const { getGoalsForMonth, addGoal, updateGoal, deleteGoal } = useGoalStore();
  const { getFilteredTransactions } = useTransactionStore();
  const goals = getGoalsForMonth(month);

  const [showAdd, setShowAdd] = useState(false);
  const [addLabel, setAddLabel] = useState('');
  const [addTarget, setAddTarget] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editSaved, setEditSaved] = useState('');

  // Auto-calculate saved: sum savings/investment transactions for that month
  const savingsTxs = getFilteredTransactions({ month, type: 'debit' })
    .filter((t) => SAVINGS_CATEGORIES.includes(t.category));
  const autoSaved = savingsTxs.reduce((s, t) => s + t.amount, 0);

  const handleAdd = () => {
    const target = parseFloat(addTarget);
    if (!addLabel.trim() || isNaN(target) || target <= 0) return;
    addGoal({ label: addLabel.trim(), target, saved: autoSaved, month });
    setAddLabel('');
    setAddTarget('');
    setShowAdd(false);
  };

  const startEdit = (goal: Goal) => {
    setEditingId(goal.id);
    setEditLabel(goal.label);
    setEditTarget(String(goal.target));
    setEditSaved(String(goal.saved));
  };

  const saveEdit = (id: string) => {
    const target = parseFloat(editTarget);
    const saved = parseFloat(editSaved);
    if (isNaN(target) || target <= 0) return;
    updateGoal(id, { label: editLabel.trim(), target, saved: isNaN(saved) ? 0 : saved });
    setEditingId(null);
  };

  return (
    <div className="bento-card flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <p style={{ fontSize: 16, fontWeight: 600, color: '#0A0A0A', letterSpacing: '-0.02em' }}>Goals</p>
        <button
          onClick={() => { setShowAdd((v) => !v); setAddLabel(''); setAddTarget(''); }}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-[#F0F0F0]"
          title="Add goal"
        >
          <Plus size={15} strokeWidth={2} color="#525252" />
        </button>
      </div>

      <div style={{ borderTop: '1.5px solid #E4E4E4', marginLeft: 24, marginRight: 24 }} />

      <div className="flex-1 overflow-auto px-6">

        {/* Add form */}
        {showAdd && (
          <div className="my-3 p-3 rounded-[10px] border border-[#E4E4E4] bg-[#F7F7F7] space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#8A8A8A]">New Goal</p>
            <input
              type="text"
              placeholder="Goal name…"
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[12px] font-medium text-[#0A0A0A] border border-[#E4E4E4] rounded-[6px] bg-white focus:outline-none focus:border-[#0A0A0A]"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#8A8A8A]">₹</span>
                <input
                  type="number"
                  placeholder="Target amount"
                  value={addTarget}
                  onChange={(e) => setAddTarget(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false); }}
                  className="w-full pl-6 pr-2.5 py-1.5 text-[12px] font-medium text-[#0A0A0A] border border-[#E4E4E4] rounded-[6px] bg-white focus:outline-none focus:border-[#0A0A0A]"
                />
              </div>
              <button onClick={handleAdd} className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-[#0A0A0A] text-white hover:bg-[#2C2C2C] transition-colors"><Check size={13} /></button>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#E4E4E4] text-[#525252] hover:bg-white transition-colors"><X size={13} /></button>
            </div>
            {autoSaved > 0 && (
              <p className="text-[11px] text-[#8A8A8A]">Saved progress will be auto-set to {formatCurrency(autoSaved)} from this month's savings transactions.</p>
            )}
          </div>
        )}

        {/* Edit form */}
        {editingId && (
          <div className="my-3 p-3 rounded-[10px] border border-[#E4E4E4] bg-[#F7F7F7] space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#8A8A8A]">Edit Goal</p>
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[12px] font-medium text-[#0A0A0A] border border-[#E4E4E4] rounded-[6px] bg-white focus:outline-none focus:border-[#0A0A0A]"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[#8A8A8A]">Target ₹</span>
                <input type="number" value={editTarget} onChange={(e) => setEditTarget(e.target.value)}
                  className="w-full pl-16 pr-2 py-1.5 text-[12px] font-medium text-[#0A0A0A] border border-[#E4E4E4] rounded-[6px] bg-white focus:outline-none focus:border-[#0A0A0A]" />
              </div>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[#8A8A8A]">Saved ₹</span>
                <input type="number" value={editSaved} onChange={(e) => setEditSaved(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(editingId); if (e.key === 'Escape') setEditingId(null); }}
                  className="w-full pl-14 pr-2 py-1.5 text-[12px] font-medium text-[#0A0A0A] border border-[#E4E4E4] rounded-[6px] bg-white focus:outline-none focus:border-[#0A0A0A]" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => saveEdit(editingId)} className="text-[11px] font-medium text-white bg-[#0A0A0A] px-3 py-1 rounded-[6px] hover:bg-[#2C2C2C] transition-colors">Save</button>
              <button onClick={() => setEditingId(null)} className="text-[11px] font-medium text-[#525252] px-3 py-1 rounded-[6px] border border-[#E4E4E4] hover:bg-[#F7F7F7] transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {goals.length === 0 && !showAdd ? (
          <div className="text-center py-8">
            <p style={{ fontSize: 13, color: '#8A8A8A', marginBottom: 8 }}>No goals set</p>
            <button
              onClick={() => setShowAdd(true)}
              className="text-[12px] font-medium text-[#0A0A0A] border border-[#E4E4E4] rounded-[6px] px-3 py-1.5 hover:bg-[#F7F7F7] transition-colors"
            >
              + Add first goal
            </button>
          </div>
        ) : (
          goals.map((goal, i) => (
            editingId === goal.id ? null :
            <GoalRow
              key={goal.id}
              goal={goal}
              isLast={i === goals.length - 1}
              onEdit={() => startEdit(goal)}
              onDelete={() => deleteGoal(goal.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
