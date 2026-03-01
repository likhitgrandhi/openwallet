'use client';

import { useState } from 'react';
import { useBudgetStore } from '@/lib/store/useBudgetStore';
import { useTransactionStore, CATEGORIES } from '@/lib/store/useTransactionStore';
import { formatCurrency } from '@/lib/data/seed';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/lib/utils';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const PALETTE = [
  '#173B34', '#C4B4E8', '#E2CFA0', '#8C6A42',
  '#2D8B62', '#9FC0C8', '#5B5EA8', '#D4788A',
];

interface BudgetPageProps {
  month: string;
}

export function BudgetPage({ month }: BudgetPageProps) {
  const { getBudgetsForMonth, setBudget, deleteBudget } = useBudgetStore();
  const { getCategoryBreakdown } = useTransactionStore();

  const [showForm, setShowForm] = useState(false);
  const [editCategory, setEditCategory] = useState('');
  const [formCategory, setFormCategory] = useState('Food & Dining');
  const [formAmount, setFormAmount] = useState('');

  const budgets = getBudgetsForMonth(month);
  const breakdown = getCategoryBreakdown(month);
  const spentMap = Object.fromEntries(breakdown.map((b) => [b.category, b.amount]));

  const pieData = budgets.map((b, i) => ({
    name: b.category,
    value: b.amount,
    color: PALETTE[i % PALETTE.length],
  }));

  const openEdit = (category: string, amount: number) => {
    setEditCategory(category);
    setFormCategory(category);
    setFormAmount(String(amount));
    setShowForm(true);
  };

  const openAdd = () => {
    setEditCategory('');
    setFormCategory('Food & Dining');
    setFormAmount('');
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formCategory || !formAmount) return;
    setBudget(formCategory, parseFloat(formAmount), month, false);
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9E9E9E]">
          {budgets.length} categories budgeted
        </p>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 text-xs font-medium text-[#173B34] hover:underline"
        >
          <Plus className="w-3 h-3" />
          Add budget
        </button>
      </div>

      <div className="grid grid-cols-5 gap-8">
        {/* Budget list */}
        <div className="col-span-3 space-y-5">
          {budgets.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-[#9E9E9E] mb-3">No budgets set for this month</p>
              <Button size="sm" onClick={openAdd}
                className="bg-[#173B34] hover:bg-[#173B34]/90 text-white text-xs">
                Create your first budget
              </Button>
            </div>
          ) : (
            budgets.map((budget, i) => {
              const spent = spentMap[budget.category] || 0;
              const pct = Math.min((spent / budget.amount) * 100, 100);
              const isOver = spent > budget.amount;
              const isWarning = pct >= 80 && !isOver;
              const barColor = isOver ? '#D93838' : isWarning ? '#D97B00' : PALETTE[i % PALETTE.length];

              return (
                <div key={budget.id} className="group">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-sm text-[#1A1A1A]">{budget.category}</span>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        'text-sm font-medium tabular-nums',
                        isOver ? 'text-[#D93838]' : isWarning ? 'text-[#D97B00]' : 'text-[#1A1A1A]'
                      )}>
                        {formatCurrency(spent)}
                        <span className="text-[#ABABAB] font-normal"> / {formatCurrency(budget.amount)}</span>
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={() => openEdit(budget.category, budget.amount)}
                          className="text-[#ABABAB] hover:text-[#6B6B6B]"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteBudget(budget.id)}
                          className="text-[#ABABAB] hover:text-[#D93838]"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="relative h-[5px] w-full bg-[#EFEFED] rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: barColor }}
                    />
                  </div>
                  <p className={cn(
                    'text-[11px] mt-1',
                    isOver ? 'text-[#D93838]' : isWarning ? 'text-[#D97B00]' : 'text-[#ABABAB]'
                  )}>
                    {isOver
                      ? `${formatCurrency(spent - budget.amount)} over budget`
                      : `${formatCurrency(budget.amount - spent)} remaining`}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Donut chart */}
        <div className="col-span-2">
          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9E9E9E] mb-4">
            Allocation
          </p>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={1.5}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => formatCurrency(v as number)}
                  contentStyle={{
                    background: '#1A1A1A', border: 'none', borderRadius: '8px',
                    fontSize: '12px', color: '#fff', boxShadow: 'none',
                  }}
                  itemStyle={{ color: '#ABABAB' }}
                />
                <Legend
                  iconType="circle"
                  iconSize={7}
                  formatter={(value) => (
                    <span style={{ fontSize: '11px', color: '#6B6B6B' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[#ABABAB] py-16 text-center">No budgets yet</p>
          )}
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-base">{editCategory ? 'Edit Budget' : 'Add Budget'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div>
              <label className="text-xs font-medium text-[#6B6B6B] mb-1.5 block">Category</label>
              <Select value={formCategory} onValueChange={setFormCategory} disabled={!!editCategory}>
                <SelectTrigger className="border-[#E8E8E6] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c !== 'Income').map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B6B6B] mb-1.5 block">Monthly limit (₹)</label>
              <Input
                type="number"
                placeholder="5000"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="border-[#E8E8E6] focus-visible:ring-[#173B34]"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 border-[#E8E8E6] text-sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#173B34] hover:bg-[#173B34]/90 text-sm"
                onClick={handleSave}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
