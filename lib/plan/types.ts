export interface PlanLiability {
  id: string;
  label: string;
  amount: number;
}

export interface PlanAllocations {
  savingsPct: number;
  investmentsPct: number;
  needsPct: number;
  wantsPct: number;
}

export interface PlanAmounts {
  savingsAmt: number;
  investmentsAmt: number;
  needsAmt: number;
  wantsAmt: number;
}

export interface PlanCategoryBudget {
  category: string;
  amount: number;
}

export interface PlanSessionState {
  month: string;
  income: number;
  liabilities: PlanLiability[];
  allocations: PlanAllocations;
  amounts: PlanAmounts;
  categoryBudgets: PlanCategoryBudget[];
  dirty: boolean;
  source: 'manual' | 'ai' | 'heuristic';
}

export interface PlannerAIResponse {
  allocations: PlanAllocations;
  categoryBudgets: PlanCategoryBudget[];
  narrative: string;
}
