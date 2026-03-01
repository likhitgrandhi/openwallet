'use client';

import { create } from 'zustand';

export interface Goal {
  id: string;
  label: string;
  target: number;
  saved: number;
  month: string;
}

interface GoalStore {
  goals: Goal[];
  setPlannerGoals: (month: string, savingsAmount: number, investmentsAmount: number) => void;
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  getGoalsForMonth: (month: string) => Goal[];
}

export const useGoalStore = create<GoalStore>((set, get) => ({
  goals: [],

  setPlannerGoals: (month, savingsAmount, investmentsAmount) => {
    const plannerGoals: Goal[] = [
      { id: `goal-savings-${month}`, label: 'Monthly Savings Goal', target: Math.max(0, savingsAmount), saved: 0, month },
      { id: `goal-investments-${month}`, label: 'Monthly Investment Goal', target: Math.max(0, investmentsAmount), saved: 0, month },
    ];
    set((state) => ({
      goals: [
        ...state.goals.filter((g) => g.month !== month || (!g.id.startsWith('goal-savings-') && !g.id.startsWith('goal-investments-'))),
        ...plannerGoals,
      ],
    }));
  },

  addGoal: (goal) => {
    const newGoal: Goal = { ...goal, id: `goal-custom-${Date.now()}` };
    set((s) => ({ goals: [...s.goals, newGoal] }));
  },

  updateGoal: (id, updates) => {
    set((s) => ({ goals: s.goals.map((g) => g.id === id ? { ...g, ...updates } : g) }));
  },

  deleteGoal: (id) => {
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
  },

  getGoalsForMonth: (month) => get().goals.filter((g) => g.month === month),
}));
