import { db, type Budget } from './schema';

export async function getAllBudgets(): Promise<Budget[]> {
  return db.budgets.toArray();
}

export async function getBudgetsForMonth(month: string): Promise<Budget[]> {
  return db.budgets.where('month').equals(month).toArray();
}

export async function setBudget(
  category: string,
  amount: number,
  month: string,
  applyForward = false
): Promise<Budget> {
  const existing = await db.budgets
    .where('month')
    .equals(month)
    .filter(b => b.category === category)
    .first();

  if (existing) {
    await db.budgets.update(existing.id, { amount, applyForward });
    return { ...existing, amount, applyForward };
  }

  const newBudget: Budget = {
    id: `b-${category}-${month}-${Date.now()}`,
    category,
    amount,
    month,
    applyForward,
    createdAt: new Date(),
  };
  await db.budgets.add(newBudget);

  if (applyForward) {
    await propagateBudgetForward(newBudget);
  }

  return newBudget;
}

async function propagateBudgetForward(budget: Budget): Promise<void> {
  const [year, month] = budget.month.split('-').map(Number);
  const futureMonths: string[] = [];
  for (let i = 1; i <= 12; i++) {
    const d = new Date(year, month - 1 + i, 1);
    futureMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  for (const futureMonth of futureMonths) {
    const exists = await db.budgets
      .where('month')
      .equals(futureMonth)
      .filter(b => b.category === budget.category)
      .first();

    if (!exists) {
      await db.budgets.add({
        id: `b-${budget.category}-${futureMonth}-${Date.now()}`,
        category: budget.category,
        amount: budget.amount,
        month: futureMonth,
        applyForward: true,
        createdAt: new Date(),
      });
    }
  }
}

export async function deleteBudget(id: string): Promise<void> {
  await db.budgets.delete(id);
}

export async function getBudgetCount(): Promise<number> {
  return db.budgets.count();
}

export async function seedBudgets(budgets: Budget[]): Promise<void> {
  await db.budgets.bulkPut(budgets);
}
