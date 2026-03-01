'use client';

import { useBudgetStore } from '@/lib/store/useBudgetStore';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { formatCurrency } from '@/lib/data/seed';
import { cn } from '@/lib/utils';

const BAR_COLORS = [
  '#173B34', '#2D8B62', '#C4B4E8', '#E2CFA0',
  '#8C6A42', '#9FC0C8', '#D4788A', '#5B5EA8',
];

interface BudgetProgressListProps {
  month: string;
}

export function BudgetProgressList({ month }: BudgetProgressListProps) {
  const { getBudgetsForMonth } = useBudgetStore();
  const { getCategoryBreakdown } = useTransactionStore();

  const budgets = getBudgetsForMonth(month);
  const breakdown = getCategoryBreakdown(month);
  const spentMap = Object.fromEntries(breakdown.map((b) => [b.category, b.amount]));

  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9E9E9E] mb-5">
        Budget
      </p>
      {budgets.length === 0 ? (
        <p className="text-sm text-[#ABABAB]">No budgets set</p>
      ) : (
        <div className="space-y-5">
          {budgets.map((budget, i) => {
            const spent = spentMap[budget.category] || 0;
            const pct = Math.min((spent / budget.amount) * 100, 100);
            const isOver = spent > budget.amount;
            const isWarning = pct >= 80 && !isOver;
            const barColor = isOver ? '#D93838' : isWarning ? '#D97B00' : BAR_COLORS[i % BAR_COLORS.length];

            return (
              <div key={budget.id}>
                {/* Label row */}
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-sm text-[#1A1A1A]">{budget.category}</span>
                  <span className="text-sm font-medium tabular-nums text-[#1A1A1A]">
                    {formatCurrency(budget.amount)}
                  </span>
                </div>
                {/* Bar track */}
                <div className="relative h-[5px] w-full bg-[#EFEFED] rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
                {/* Sub label */}
                <p className={cn(
                  'text-[11px] mt-1',
                  isOver ? 'text-[#D93838]' : isWarning ? 'text-[#D97B00]' : 'text-[#ABABAB]'
                )}>
                  {formatCurrency(spent)} spent
                  {isOver && ` · ${formatCurrency(spent - budget.amount)} over`}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
