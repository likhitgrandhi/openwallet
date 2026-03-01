import { CATEGORIES } from '@/lib/data/seed';
import type {
  PlanAllocations,
  PlanAmounts,
  PlanCategoryBudget,
  PlanLiability,
  PlanSessionState,
} from './types';

const NEEDS_CATEGORIES = ['Housing', 'Food & Dining', 'Health & Wellness', 'Auto & Transport', 'Education'];
const WANTS_CATEGORIES = ['Entertainment', 'Shopping', 'Travel & Vacation', 'Subscriptions'];

const NEEDS_WEIGHTS: Record<string, number> = {
  Housing: 0.45,
  'Food & Dining': 0.25,
  'Health & Wellness': 0.12,
  'Auto & Transport': 0.12,
  Education: 0.06,
};

const WANTS_WEIGHTS: Record<string, number> = {
  Entertainment: 0.3,
  Shopping: 0.35,
  'Travel & Vacation': 0.2,
  Subscriptions: 0.15,
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function getLiabilitiesTotal(liabilities: PlanLiability[]): number {
  return liabilities.reduce((sum, item) => sum + Math.max(0, Number(item.amount) || 0), 0);
}

export function getDisposableIncome(income: number, liabilities: PlanLiability[]): number {
  return Math.max(0, income - getLiabilitiesTotal(liabilities));
}

export function normalizeAllocations(input: PlanAllocations): PlanAllocations {
  const raw = {
    savingsPct: Math.max(0, Number(input.savingsPct) || 0),
    investmentsPct: Math.max(0, Number(input.investmentsPct) || 0),
    needsPct: Math.max(0, Number(input.needsPct) || 0),
    wantsPct: Math.max(0, Number(input.wantsPct) || 0),
  };
  const total = raw.savingsPct + raw.investmentsPct + raw.needsPct + raw.wantsPct;
  if (total <= 0) {
    return { savingsPct: 25, investmentsPct: 15, needsPct: 45, wantsPct: 15 };
  }
  return {
    savingsPct: round2((raw.savingsPct / total) * 100),
    investmentsPct: round2((raw.investmentsPct / total) * 100),
    needsPct: round2((raw.needsPct / total) * 100),
    wantsPct: round2((raw.wantsPct / total) * 100),
  };
}

export function calculatePlanAmounts(disposableIncome: number, allocations: PlanAllocations): PlanAmounts {
  const normalized = normalizeAllocations(allocations);
  return {
    savingsAmt: round2((disposableIncome * normalized.savingsPct) / 100),
    investmentsAmt: round2((disposableIncome * normalized.investmentsPct) / 100),
    needsAmt: round2((disposableIncome * normalized.needsPct) / 100),
    wantsAmt: round2((disposableIncome * normalized.wantsPct) / 100),
  };
}

function distributeByWeights(total: number, weights: Record<string, number>): PlanCategoryBudget[] {
  const entries = Object.entries(weights);
  return entries.map(([category, weight]) => ({
    category,
    amount: round2(total * weight),
  }));
}

export function computeBudgetSuggestions(disposableIncome: number, allocations: PlanAllocations): PlanCategoryBudget[] {
  const amounts = calculatePlanAmounts(disposableIncome, allocations);
  const fixed: PlanCategoryBudget[] = [
    { category: 'Savings', amount: amounts.savingsAmt },
    { category: 'Investments', amount: amounts.investmentsAmt },
  ];
  const needs = distributeByWeights(amounts.needsAmt, NEEDS_WEIGHTS);
  const wants = distributeByWeights(amounts.wantsAmt, WANTS_WEIGHTS);
  return [...fixed, ...needs, ...wants].filter((b) => CATEGORIES.includes(b.category));
}

export function heuristicPlan(income: number, liabilities: PlanLiability[]): Pick<PlanSessionState, 'allocations' | 'amounts' | 'categoryBudgets'> {
  const disposable = getDisposableIncome(income, liabilities);
  const allocations: PlanAllocations = normalizeAllocations({
    savingsPct: 25,
    investmentsPct: 15,
    needsPct: 45,
    wantsPct: 15,
  });
  const amounts = calculatePlanAmounts(disposable, allocations);
  const categoryBudgets = computeBudgetSuggestions(disposable, allocations);
  return { allocations, amounts, categoryBudgets };
}

export function sanitizeCategoryBudgets(input: PlanCategoryBudget[]): PlanCategoryBudget[] {
  const seen = new Map<string, number>();
  for (const b of input) {
    const category = String(b.category || '').trim();
    if (!category || !CATEGORIES.includes(category)) continue;
    const amount = Math.max(0, Number(b.amount) || 0);
    seen.set(category, round2((seen.get(category) ?? 0) + amount));
  }
  return Array.from(seen.entries()).map(([category, amount]) => ({ category, amount }));
}

export { NEEDS_CATEGORIES, WANTS_CATEGORIES };
