'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, BotIcon, Loading03Icon, Add01Icon, MailSend01Icon, SparklesIcon, Delete02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency, getCurrentMonth, CATEGORIES } from '@/lib/data/seed';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { useBudgetStore } from '@/lib/store/useBudgetStore';
import { useGoalStore } from '@/lib/store/useGoalStore';
import { usePlanSession } from '@/lib/store/usePlanSession';
import { getDisposableIncome, getLiabilitiesTotal, heuristicPlan } from '@/lib/plan/heuristics';
import type { PlanAllocations, PlanCategoryBudget } from '@/lib/plan/types';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  allocations?: PlanAllocations;
  budgets?: PlanCategoryBudget[];
  usedFallback?: boolean;
}

const SUGGESTIONS = [
  'I want to save 30% this month and reduce shopping spend.',
  'Keep my needs realistic, but increase investments by 5%.',
  'I have a 12,000 EMI and 22,000 rent. Suggest a comfortable split.',
];

const ALLOCATION_KEYS: Array<{ key: keyof PlanAllocations; label: string }> = [
  { key: 'savingsPct', label: 'Savings' },
  { key: 'investmentsPct', label: 'Investments' },
  { key: 'needsPct', label: 'Needs' },
  { key: 'wantsPct', label: 'Wants' },
];

export default function PlanPage() {
  const router = useRouter();
  const month = getCurrentMonth();
  const { getMonthlyStats } = useTransactionStore();
  const { setBudget } = useBudgetStore();
  const { setPlannerGoals } = useGoalStore();

  const {
    income,
    liabilities,
    allocations,
    amounts,
    categoryBudgets,
    source,
    setMonthIncome,
    setLiabilities,
    updateAllocation,
    setAllocations,
    setCategoryBudgets,
    markClean,
  } = usePlanSession();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    const stats = getMonthlyStats(month);
    setMonthIncome(month, stats.totalIncome);
  }, [getMonthlyStats, month, setMonthIncome]);

  const liabilitiesTotal = useMemo(() => getLiabilitiesTotal(liabilities), [liabilities]);
  const disposableIncome = useMemo(() => getDisposableIncome(income, liabilities), [income, liabilities]);
  const allocationTotal = useMemo(
    () => allocations.savingsPct + allocations.investmentsPct + allocations.needsPct + allocations.wantsPct,
    [allocations]
  );

  const addLiability = () => {
    setLiabilities([...liabilities, { id: `liab-${Date.now()}`, label: '', amount: 0 }]);
  };

  const updateLiability = (id: string, updates: { label?: string; amount?: number }) => {
    setLiabilities(
      liabilities.map((item) =>
        item.id === id
          ? {
              ...item,
              ...(updates.label !== undefined ? { label: updates.label } : {}),
              ...(updates.amount !== undefined ? { amount: updates.amount } : {}),
            }
          : item
      )
    );
  };

  const removeLiability = (id: string) => {
    setLiabilities(liabilities.filter((item) => item.id !== id));
  };

  const handleAllocationChange = (key: keyof PlanAllocations, value: number) => {
    updateAllocation(key, value);
  };

  const handleAskAI = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || loading) return;
    setError(null);
    setInput('');
    setLoading(true);
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: prompt }]);

    try {
      const response = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          income,
          liabilities,
          allocations,
          categoryBudgets,
          categories: CATEGORIES,
          message: prompt,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Planner error (${response.status})`);

      setAllocations(data.allocations, data.usedFallback ? 'heuristic' : 'ai');
      setCategoryBudgets(data.categoryBudgets, data.usedFallback ? 'heuristic' : 'ai');
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: data.narrative || 'Plan updated.',
          allocations: data.allocations,
          budgets: data.categoryBudgets,
          usedFallback: Boolean(data.usedFallback),
        },
      ]);
    } catch (e) {
      const fallback = heuristicPlan(income, liabilities);
      setAllocations(fallback.allocations, 'heuristic');
      setCategoryBudgets(fallback.categoryBudgets, 'heuristic');
      setMessages((prev) => [
        ...prev,
        {
          id: `a-fallback-${Date.now()}`,
          role: 'assistant',
          text: 'AI was unavailable, so I applied a safe baseline allocation.',
          allocations: fallback.allocations,
          budgets: fallback.categoryBudgets,
          usedFallback: true,
        },
      ]);
      setError(e instanceof Error ? e.message : 'Something went wrong while planning.');
    } finally {
      setLoading(false);
    }
  };

  const applyPlan = () => {
    for (const budget of categoryBudgets) {
      if (budget.amount <= 0) continue;
      setBudget(budget.category, budget.amount, month, false, true);
    }
    setPlannerGoals(month, amounts.savingsAmt, amounts.investmentsAmt);
    markClean();
    setConfirmOpen(false);
    setApplied(true);
    window.setTimeout(() => router.push('/'), 900);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleAskAI(input);
    }
  };

  return (
    <div className="min-h-screen py-[40px]">
      <div className="max-w-[1180px] mx-auto px-6 pl-[72px]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-1 text-[14px] text-[#525252] hover:text-[#0A0A0A] transition-colors">
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={1.5} />
            Back
          </Link>
          <span className="text-[#E4E4E4]">/</span>
          <p className="text-[14px] text-[#8A8A8A]">Monthly Planner</p>
        </div>
        <Button
          onClick={() => setConfirmOpen(true)}
          className="rounded-[8px] bg-[#0A0A0A] hover:bg-[#2C2C2C] text-white text-[14px] font-medium tracking-[-0.01em] border border-[#0A0A0A] hover:-translate-y-px transition-all duration-150"
        >
          Apply plan
        </Button>
      </div>

      <div className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A] mb-2">Budget planning</p>
        <h1
          className="font-bold text-[28px] leading-[1.2] text-[#0A0A0A]"
          style={{ letterSpacing: '-0.03em' }}
        >
          What can I do with my income this month?
        </h1>
        <p className="text-[14px] text-[#525252] leading-[1.5] mt-2">
          Add liabilities, adjust goals, and refine with AI chat. Then apply the plan to your monthly budgets.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 lg:col-span-7 border border-[#E4E4E4] rounded-[12px] bg-white p-6 flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard label="Income (this month)" value={formatCurrency(income)} />
            <StatCard label="Liabilities" value={formatCurrency(liabilitiesTotal)} />
            <StatCard label="Disposable" value={formatCurrency(disposableIncome)} />
          </div>

          <div className="rounded-[8px] border border-[#E4E4E4] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[#1A1A1A]">Liabilities</p>
              <button
                type="button"
                onClick={addLiability}
                className="inline-flex items-center gap-1 text-[12px] text-[#0A0A0A] font-medium hover:text-[#2C2C2C] transition-colors"
              >
                <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.5} />
                Add liability
              </button>
            </div>
            <div className="space-y-2">
              {liabilities.length === 0 ? (
                <p className="text-xs text-[#ABABAB]">No liabilities added yet.</p>
              ) : (
                liabilities.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_140px_32px] gap-2">
                    <Input
                      value={item.label}
                      onChange={(e) => updateLiability(item.id, { label: e.target.value })}
                      placeholder="e.g. Rent / EMI"
                      className="border-[#E8E8E6]"
                    />
                    <Input
                      type="number"
                      min="0"
                      value={item.amount || ''}
                      onChange={(e) => updateLiability(item.id, { amount: Number(e.target.value) || 0 })}
                      placeholder="Amount"
                      className="border-[#E8E8E6]"
                    />
                    <button
                      type="button"
                      onClick={() => removeLiability(item.id)}
                      className="inline-flex items-center justify-center rounded-md border border-[#E8E8E6] hover:bg-[#f8f8f8]"
                      aria-label="Remove liability"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.5} className="text-[#8A8A8A]" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[8px] border border-[#E4E4E4] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[#1A1A1A]">Allocation</p>
              <p className={cn('text-xs', Math.abs(allocationTotal - 100) <= 0.5 ? 'text-[#1A8A4E]' : 'text-[#D97706]')}>
                Total {allocationTotal.toFixed(1)}%
              </p>
            </div>
            <div className="space-y-3">
              {ALLOCATION_KEYS.map(({ key, label }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#6B6B6B]">{label}</span>
                    <span className="text-xs font-medium text-[#474747]">{allocations[key].toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={0.5}
                    value={allocations[key]}
                    onChange={(e) => handleAllocationChange(key, Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
              <AmountCard label="Savings" value={amounts.savingsAmt} />
              <AmountCard label="Investments" value={amounts.investmentsAmt} />
              <AmountCard label="Needs" value={amounts.needsAmt} />
              <AmountCard label="Wants" value={amounts.wantsAmt} />
            </div>
          </div>

          <div className="rounded-[8px] border border-[#E4E4E4] p-4">
            <p className="text-sm font-medium text-[#1A1A1A] mb-2">Suggested category budgets</p>
            <div className="max-h-[220px] overflow-auto border border-[#f1f1ef] rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-[#fafaf8] border-b border-[#f1f1ef]">
                  <tr>
                    <th className="text-left font-medium text-[#9E9E9E] px-3 py-2">Category</th>
                    <th className="text-right font-medium text-[#9E9E9E] px-3 py-2">Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBudgets.map((item) => (
                    <tr key={item.category} className="border-b border-[#f7f7f5] last:border-b-0">
                      <td className="px-3 py-2 text-[#474747]">{item.category}</td>
                      <td className="px-3 py-2 text-right font-medium text-[#1A1A1A]">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-[#ABABAB] mt-2">Source: {source === 'ai' ? 'AI recommendation' : source === 'heuristic' ? 'Baseline heuristic' : 'Manual edits'}</p>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-5 border border-[#E4E4E4] rounded-[12px] bg-white p-5 flex flex-col min-h-[680px]">
          <div className="flex items-center gap-2 mb-3">
            <div className="size-7 rounded-full bg-[#0A0A0A] flex items-center justify-center">
              <HugeiconsIcon icon={BotIcon} size={16} strokeWidth={1.5} color="white" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#1A1A1A]">Planner Chat</p>
              <p className="text-[11px] text-[#9E9E9E]">Use natural language to refine your plan</p>
            </div>
          </div>

          <div className="space-y-1.5 mb-3">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleAskAI(suggestion)}
                className="w-full text-left text-[14px] rounded-[8px] border border-[#E4E4E4] px-3 py-2 text-[#525252] hover:bg-[#F7F7F7] hover:border-[#C4C4C4] transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="flex-1 rounded-[8px] border border-[#E4E4E4] p-3 overflow-auto space-y-3 bg-[#F7F7F7]">
            {messages.length === 0 && <p className="text-xs text-[#ABABAB]">Start by asking the assistant to tune your monthly plan.</p>}
            {messages.map((msg) => (
              <div key={msg.id} className={cn('max-w-[92%]', msg.role === 'user' ? 'ml-auto' : 'mr-auto')}>
                <div
                  className={cn(
                    'rounded-xl px-3 py-2 text-sm',
                    msg.role === 'user'
                      ? 'bg-[#0A0A0A] text-white'
                      : msg.role === 'system'
                      ? 'bg-[#f4f4f2] text-[#6B6B6B] text-xs'
                      : 'bg-white border border-[#ececea] text-[#333]'
                  )}
                >
                  {msg.text}
                </div>
                {msg.role === 'assistant' && msg.allocations && (
                  <div className="mt-1.5 text-[11px] text-[#6B6B6B] flex flex-wrap gap-2">
                    <span>S {msg.allocations.savingsPct.toFixed(0)}%</span>
                    <span>I {msg.allocations.investmentsPct.toFixed(0)}%</span>
                    <span>N {msg.allocations.needsPct.toFixed(0)}%</span>
                    <span>W {msg.allocations.wantsPct.toFixed(0)}%</span>
                    {msg.usedFallback && <span className="text-[#D97706]">fallback</span>}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="inline-flex items-center gap-2 text-sm text-[#6B6B6B]">
                <HugeiconsIcon icon={Loading03Icon} size={16} strokeWidth={1.5} className="animate-spin" />
                Thinking...
              </div>
            )}
          </div>

          {error && <p className="text-xs text-[#D93838] mt-2">{error}</p>}

          <div className="mt-3 flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="e.g. Keep wants under 10% and increase emergency savings."
              rows={3}
              className="border-[#E8E8E6] resize-none"
            />
            <Button
              onClick={() => handleAskAI(input)}
              disabled={!input.trim() || loading}
              className="h-10 w-10 p-0 rounded-[8px] bg-[#0A0A0A] hover:bg-[#2C2C2C]"
            >
              <HugeiconsIcon icon={MailSend01Icon} size={16} strokeWidth={1.5} />
            </Button>
          </div>
        </section>
      </div>

      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply monthly plan for {month}</DialogTitle>
            <DialogDescription>
              This will update your monthly budgets and set planner goals for savings and investments.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Income" value={formatCurrency(income)} />
            <StatCard label="Liabilities" value={formatCurrency(liabilitiesTotal)} />
            <StatCard label="Disposable" value={formatCurrency(disposableIncome)} />
            <StatCard label="Budgets" value={String(categoryBudgets.length)} />
          </div>

          <div className="rounded-lg border border-[#ececea]">
            <table className="w-full text-sm">
              <thead className="bg-[#fafaf8] border-b border-[#ececea]">
                <tr>
                  <th className="text-left px-3 py-2 text-[#9E9E9E] font-medium">Category</th>
                  <th className="text-right px-3 py-2 text-[#9E9E9E] font-medium">Budget</th>
                </tr>
              </thead>
              <tbody>
                {categoryBudgets.map((row) => (
                  <tr key={row.category} className="border-b border-[#f5f5f3] last:border-b-0">
                    <td className="px-3 py-2">{row.category}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Go back
            </Button>
            <Button onClick={applyPlan} className="rounded-[8px] bg-[#0A0A0A] hover:bg-[#2C2C2C] text-white border border-[#0A0A0A]">
              Confirm & Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {applied && (
        <div className="fixed bottom-6 right-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] bg-[#0A0A0A] text-white shadow-md">
          <HugeiconsIcon icon={SparklesIcon} size={16} strokeWidth={1.5} />
          Plan applied to budgets and goals.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[#E4E4E4] bg-white px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8A8A8A] mb-0.5">{label}</p>
      <p className="text-[14px] font-semibold text-[#0A0A0A] tabular-nums">{value}</p>
    </div>
  );
}

function AmountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[8px] border border-[#E4E4E4] bg-[#F7F7F7] px-2.5 py-2">
      <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#8A8A8A]">{label}</p>
      <p className="text-[12px] font-semibold text-[#0A0A0A] tabular-nums">{formatCurrency(value)}</p>
    </div>
  );
}
