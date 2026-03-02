'use client';

import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { formatCurrency } from '@/lib/data/seed';

interface MetricsCardProps {
  month: string;
}

export function MetricsCard({ month }: MetricsCardProps) {
  const { getMonthlyStats } = useTransactionStore();
  const stats = getMonthlyStats(month);

  const tiles = [
    { label: 'Income',      value: formatCurrency(stats.totalIncome),   color: '#2d8b62' },
    { label: 'Spending',    value: formatCurrency(stats.totalExpenses),  color: '#01291e' },
    { label: 'Net Savings', value: formatCurrency(stats.savings),        color: stats.savings >= 0 ? '#2d8b62' : '#d93838' },
  ];

  return (
    <div className="w-full h-full overflow-clip flex" style={{ background: '#fff' }}>
      {tiles.map((tile, i) => (
        <div
          key={tile.label}
          className="flex-1 flex flex-col items-center justify-center gap-[4px] relative"
        >
          {/* Inner divider */}
          {i > 0 && (
            <div className="absolute left-0 top-[22%] bottom-[22%] w-px bg-[#ebebeb]" />
          )}
          <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-[#c0c0c0]">
            {tile.label}
          </p>
          <p
            className="font-numbers font-medium leading-tight"
            style={{ fontSize: 40, letterSpacing: '-1.6px', color: tile.color }}
          >
            {tile.value}
          </p>
        </div>
      ))}
    </div>
  );
}
