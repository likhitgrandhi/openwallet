'use client';

import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { formatCurrency } from '@/lib/data/seed';

interface DailySpendingCardProps {
  month: string;
}

function formatCellAmount(amount: number): string {
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  return `₹${Math.round(amount)}`;
}

export function DailySpendingCard({ month }: DailySpendingCardProps) {
  const { getFilteredTransactions } = useTransactionStore();
  const txs = getFilteredTransactions({ month, type: 'debit' });
  const [year, m] = month.split('-').map(Number);
  const daysInMonth = new Date(year, m, 0).getDate();

  const byDay: Record<number, number> = {};
  for (const tx of txs) {
    const d = tx.date.getDate();
    byDay[d] = (byDay[d] || 0) + tx.amount;
  }

  const totalSpend = txs.reduce((sum, tx) => sum + tx.amount, 0);
  const maxAmount = Math.max(...Object.values(byDay), 1);

  const today = new Date();
  const todayDay =
    today.getFullYear() === year && today.getMonth() + 1 === m
      ? today.getDate()
      : -1;

  function getCellStyle(day: number): { bg: string; textColor: string; subColor: string } {
    const amount = byDay[day] || 0;
    if (amount === 0) {
      return { bg: '#f5f5f5', textColor: '#c0c0c0', subColor: '#c0c0c0' };
    }
    const ratio = amount / maxAmount;
    if (ratio > 0.7) {
      // High spend — soft red tint, dark text
      return { bg: '#fde8e8', textColor: '#1a1a1a', subColor: '#c0392b' };
    }
    if (ratio > 0.35) {
      // Medium spend — warm amber tint, dark text
      return { bg: '#fef3e2', textColor: '#1a1a1a', subColor: '#b45309' };
    }
    // Low spend — light green tint, dark text
    return { bg: '#e8f5ee', textColor: '#1a1a1a', subColor: '#2e7d52' };
  }

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="bento-card p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center mb-4 shrink-0">
        <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#c0c0c0]">
          Spend This Month
        </span>
      </div>

      {/* Total spend */}
      <p
        className="font-numbers font-semibold text-[#0A0A0A] leading-none mb-5 shrink-0"
        style={{ fontSize: 28, letterSpacing: '-0.8px' }}
      >
        {formatCurrency(totalSpend)}
      </p>

      {/* Day grid — 7 columns */}
      <div className="grid grid-cols-7 gap-[4px] flex-1 content-start">
        {days.map((day) => {
          const { bg, textColor, subColor } = getCellStyle(day);
          const amount = byDay[day] || 0;
          const isToday = day === todayDay;

          return (
            <div
              key={day}
              className="flex flex-col justify-between rounded-[7px] p-[5px]"
              style={{
                background: bg,
                outline: isToday ? `1.5px solid #0A0A0A` : 'none',
                outlineOffset: '1px',
                minHeight: 44,
              }}
            >
              <span className="text-[10px] font-medium leading-none" style={{ color: textColor }}>
                {day}
              </span>
              <span className="text-[9px] font-semibold leading-none" style={{ color: subColor }}>
                {amount > 0 ? formatCellAmount(amount) : '-'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
