'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CATEGORIES as DEFAULT_CATEGORIES, CATEGORY_COLORS as DEFAULT_COLORS } from '../data/seed';

export interface CustomCategory {
  name: string;
  color: string;
}

interface CategoryStore {
  categories: CustomCategory[];
  addCategory: (name: string, color: string) => boolean; // returns false if duplicate
  updateCategory: (oldName: string, newName: string, color: string) => void;
  deleteCategory: (name: string) => void;
  getCategoryColor: (name: string) => string;
}

const defaultCategories: CustomCategory[] = DEFAULT_CATEGORIES.map((name) => ({
  name,
  color: DEFAULT_COLORS[name] ?? '#9CA3AF',
}));

export const useCategoryStore = create<CategoryStore>()(
  persist(
    (set, get) => ({
      categories: defaultCategories,

      addCategory: (name, color) => {
        const trimmed = name.trim();
        if (!trimmed) return false;
        if (get().categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return false;
        set((s) => ({ categories: [...s.categories, { name: trimmed, color }] }));
        return true;
      },

      updateCategory: (oldName, newName, color) => {
        set((s) => ({
          categories: s.categories.map((c) =>
            c.name === oldName ? { name: newName.trim() || oldName, color } : c
          ),
        }));
      },

      deleteCategory: (name) => {
        set((s) => ({ categories: s.categories.filter((c) => c.name !== name) }));
      },

      getCategoryColor: (name) => {
        return get().categories.find((c) => c.name === name)?.color ?? '#9CA3AF';
      },
    }),
    { name: 'expense-categories' }
  )
);
