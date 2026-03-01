'use client';

import { create } from 'zustand';
import { Budget } from '../db/schema';
import { SEED_BUDGETS } from '../data/seed';
import * as budgetDB from '../db/budgets';

interface BudgetStore {
  budgets: Budget[];
  isLoaded: boolean;
  loadSeedData: () => void;
  loadFromDB: () => Promise<void>;
  setBudget: (category: string, amount: number, month: string, applyForward?: boolean, persist?: boolean) => void;
  deleteBudget: (id: string, persist?: boolean) => void;
  getBudgetsForMonth: (month: string) => Budget[];
}

export const useBudgetStore = create<BudgetStore>((set, get) => ({
  budgets: [],
  isLoaded: false,

  loadSeedData: () => {
    set({ budgets: SEED_BUDGETS, isLoaded: true });
  },

  loadFromDB: async () => {
    const budgets = await budgetDB.getAllBudgets();
    set({ budgets, isLoaded: true });
  },

  setBudget: (category, amount, month, applyForward = false, persist = false) => {
    const existing = get().budgets.find((b) => b.category === category && b.month === month);
    if (existing) {
      set((s) => ({
        budgets: s.budgets.map((b) =>
          b.id === existing.id ? { ...b, amount, applyForward } : b
        ),
      }));
      if (persist) budgetDB.setBudget(category, amount, month, applyForward).catch(console.error);
    } else {
      const newBudget: Budget = {
        id: `b-${category}-${month}-${Date.now()}`,
        category,
        amount,
        month,
        applyForward,
        createdAt: new Date(),
      };
      set((s) => ({ budgets: [...s.budgets, newBudget] }));
      if (persist) budgetDB.setBudget(category, amount, month, applyForward).catch(console.error);
    }
  },

  deleteBudget: (id, persist = false) => {
    set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) }));
    if (persist) budgetDB.deleteBudget(id).catch(console.error);
  },

  getBudgetsForMonth: (month) => {
    return get().budgets.filter((b) => b.month === month);
  },
}));
