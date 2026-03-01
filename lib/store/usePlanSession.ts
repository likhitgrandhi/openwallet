'use client';

import { create } from 'zustand';
import type { PlanAllocations, PlanCategoryBudget, PlanLiability, PlanSessionState } from '@/lib/plan/types';
import {
  calculatePlanAmounts,
  computeBudgetSuggestions,
  getDisposableIncome,
  heuristicPlan,
  normalizeAllocations,
  sanitizeCategoryBudgets,
} from '@/lib/plan/heuristics';
import { getCurrentMonth } from '@/lib/data/seed';

interface PlanSessionStore extends PlanSessionState {
  setMonthIncome: (month: string, income: number) => void;
  setLiabilities: (liabilities: PlanLiability[]) => void;
  updateAllocation: (key: keyof PlanAllocations, value: number) => void;
  setAllocations: (allocations: PlanAllocations, source?: PlanSessionState['source']) => void;
  setCategoryBudgets: (budgets: PlanCategoryBudget[], source?: PlanSessionState['source']) => void;
  applyHeuristic: () => void;
  markClean: () => void;
  reset: (income: number, month?: string) => void;
}

function initialState(income = 0, month = getCurrentMonth()): PlanSessionState {
  const seed = heuristicPlan(income, []);
  return {
    month,
    income,
    liabilities: [],
    allocations: seed.allocations,
    amounts: seed.amounts,
    categoryBudgets: seed.categoryBudgets,
    dirty: false,
    source: 'heuristic',
  };
}

export const usePlanSession = create<PlanSessionStore>((set, get) => ({
  ...initialState(),

  setMonthIncome: (month, income) => {
    const current = get();
    const nextIncome = Math.max(0, Number(income) || 0);
    const disposable = getDisposableIncome(nextIncome, current.liabilities);
    set({
      month,
      income: nextIncome,
      amounts: calculatePlanAmounts(disposable, current.allocations),
      categoryBudgets: computeBudgetSuggestions(disposable, current.allocations),
    });
  },

  setLiabilities: (liabilities) => {
    const current = get();
    const sanitized = liabilities.map((item) => ({
      id: item.id,
      label: item.label.trim() || 'Liability',
      amount: Math.max(0, Number(item.amount) || 0),
    }));
    const disposable = getDisposableIncome(current.income, sanitized);
    set({
      liabilities: sanitized,
      amounts: calculatePlanAmounts(disposable, current.allocations),
      categoryBudgets: computeBudgetSuggestions(disposable, current.allocations),
      dirty: true,
      source: 'manual',
    });
  },

  updateAllocation: (key, value) => {
    const current = get();
    const proposed = { ...current.allocations, [key]: Math.max(0, Number(value) || 0) };
    const normalized = normalizeAllocations(proposed);
    const disposable = getDisposableIncome(current.income, current.liabilities);
    set({
      allocations: normalized,
      amounts: calculatePlanAmounts(disposable, normalized),
      categoryBudgets: computeBudgetSuggestions(disposable, normalized),
      dirty: true,
      source: 'manual',
    });
  },

  setAllocations: (allocations, source = 'ai') => {
    const current = get();
    const normalized = normalizeAllocations(allocations);
    const disposable = getDisposableIncome(current.income, current.liabilities);
    set({
      allocations: normalized,
      amounts: calculatePlanAmounts(disposable, normalized),
      categoryBudgets: computeBudgetSuggestions(disposable, normalized),
      dirty: true,
      source,
    });
  },

  setCategoryBudgets: (budgets, source = 'ai') => {
    set({
      categoryBudgets: sanitizeCategoryBudgets(budgets),
      dirty: true,
      source,
    });
  },

  applyHeuristic: () => {
    const current = get();
    const seed = heuristicPlan(current.income, current.liabilities);
    set({
      allocations: seed.allocations,
      amounts: seed.amounts,
      categoryBudgets: seed.categoryBudgets,
      dirty: true,
      source: 'heuristic',
    });
  },

  markClean: () => set({ dirty: false }),

  reset: (income, month = getCurrentMonth()) => set(initialState(income, month)),
}));
