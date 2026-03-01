'use client';

import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { formatCurrency } from '@/lib/data/seed';
import { cn } from '@/lib/utils';

function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function pctDelta(current: number, previous: number): number | undefined {
  if (previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

interface MetricProps {
  label: string;
  value: string;
  sub?: string;
  delta?: number;
  last?: boolean;
}

function Metric({ label, value, sub, delta, last }: MetricProps) {
  const isPositive = delta !== undefined && delta >= 0;
  return (
    <div className={cn(
      'pr-10',
      !last && 'border-r border-[#E8E8E6] mr-10'
    )}>
      <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9E9E9E] mb-2">
        {label}
      </p>
      <p className="text-4xl font-bold tabular-nums tracking-tight text-[#1A1A1A]">
        {value}
      </p>
      {sub && <p className="text-xs text-[#6B6B6B] mt-1">{sub}</p>}
      {delta !== undefined && (
        <p className={cn(
          'text-xs font-medium mt-1.5',
          isPositive ? 'text-[#1A8A4E]' : 'text-[#D93838]'
        )}>
          {isPositive ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
          <span className="text-[#ABABAB] font-normal ml-1">vs last month</span>
        </p>
      )}
    </div>
  );
}

interface SummaryCardsProps {
  month: string;
}

export function SummaryCards({ month }: SummaryCardsProps) {
  const { getMonthlyStats } = useTransactionStore();
  const stats = getMonthlyStats(month);
  const prev = getMonthlyStats(prevMonth(month));

  const expDelta = pctDelta(stats.totalExpenses, prev.totalExpenses);

  return (
    <div className="flex items-start">
      <Metric
        label="Total Income"
        value={formatCurrency(stats.totalIncome)}
        delta={pctDelta(stats.totalIncome, prev.totalIncome)}
      />
      <Metric
        label="Total Spending"
        value={formatCurrency(stats.totalExpenses)}
        delta={expDelta !== undefined ? -expDelta : undefined}
      />
      <Metric
        label="Savings"
        value={formatCurrency(stats.savings)}
        sub={`${stats.savingsRate.toFixed(0)}% of income`}
        delta={pctDelta(stats.savings, prev.savings)}
      />
      <Metric
        label="Transactions"
        value={String(stats.transactionCount)}
        delta={pctDelta(stats.transactionCount, prev.transactionCount)}
        last
      />
    </div>
  );
}
