'use client';

import { useState } from 'react';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { formatCurrency } from '@/lib/data/seed';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Transaction } from '@/lib/db/schema';

interface CalendarPageProps {
  month: string;
}

function getDaysInMonth(monthStr: string): number {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function getFirstDayOfWeek(monthStr: string): number {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(y, m - 1, 1).getDay();
}

export function CalendarPage({ month }: CalendarPageProps) {
  const { getFilteredTransactions } = useTransactionStore();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const transactions = getFilteredTransactions({ month, type: 'debit' });
  const [year, monthNum] = month.split('-').map(Number);

  const byDay: Record<number, { total: number; txs: Transaction[] }> = {};
  for (const tx of transactions) {
    const day = tx.date.getDate();
    if (!byDay[day]) byDay[day] = { total: 0, txs: [] };
    byDay[day].total += tx.amount;
    byDay[day].txs.push(tx);
  }

  const maxDay = Math.max(0, ...Object.values(byDay).map((d) => d.total));
  const daysInMonth = getDaysInMonth(month);
  const firstDay = getFirstDayOfWeek(month);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === monthNum;
  const todayDate = today.getDate();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function getOpacity(total: number): number {
    if (!total || !maxDay) return 0;
    return 0.15 + (total / maxDay) * 0.7;
  }

  const openDay = (day: number) => {
    setSelectedDay(day);
    setDrawerOpen(true);
  };

  const selectedTxs = selectedDay ? (byDay[selectedDay]?.txs || []) : [];

  return (
    <div>
      <div className="bg-white rounded-2xl card-shadow p-8">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {days.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold tracking-widest text-[#ABABAB] py-1">
              {d.toUpperCase()}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const data = byDay[day];
            const isToday = isCurrentMonth && day === todayDate;
            const opacity = getOpacity(data?.total || 0);

            return (
              <button
                key={day}
                onClick={() => data && openDay(day)}
                className={cn(
                  'aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all',
                  data ? 'cursor-pointer hover:ring-1 hover:ring-[#173B34]/30' : 'cursor-default',
                  isToday && 'ring-1.5 ring-[#173B34]'
                )}
                style={{
                  backgroundColor: data ? `rgba(23, 59, 52, ${opacity})` : '#F7F7F5',
                }}
                title={data ? formatCurrency(data.total) : undefined}
              >
                <span className={cn(
                  'text-xs font-medium',
                  data && opacity > 0.5 ? 'text-white' : isToday ? 'text-[#173B34]' : 'text-[#6B6B6B]'
                )}>
                  {day}
                </span>
                {data && (
                  <span className={cn(
                    'hidden sm:block mt-0.5',
                    opacity > 0.5 ? 'text-white/70' : 'text-[#9E9E9E]'
                  )}
                    style={{ fontSize: '8px' }}
                  >
                    {formatCurrency(data.total)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-6 justify-end">
          <span className="text-[10px] text-[#ABABAB]">Less</span>
          {[0.15, 0.35, 0.55, 0.75, 0.85].map((o, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-md"
              style={{ backgroundColor: `rgba(23, 59, 52, ${o})` }}
            />
          ))}
          <span className="text-[10px] text-[#ABABAB]">More</span>
        </div>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-[360px] sm:max-w-[360px] bg-white">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-base font-semibold">
              {selectedDay
                ? new Date(year, monthNum - 1, selectedDay).toLocaleDateString('en-IN', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })
                : ''}
            </SheetTitle>
          </SheetHeader>
          {selectedTxs.length === 0 ? (
            <p className="text-sm text-[#ABABAB]">No transactions</p>
          ) : (
            <div>
              <p className="text-xs text-[#9E9E9E] mb-4">
                {formatCurrency(byDay[selectedDay!]?.total || 0)} spent · {selectedTxs.length} transaction{selectedTxs.length > 1 ? 's' : ''}
              </p>
              {selectedTxs.map((tx, i) => (
                <div
                  key={tx.id}
                  className={cn('flex items-center justify-between py-3', i < selectedTxs.length - 1 && 'border-b border-[#F0F0EE]')}
                >
                  <div>
                    <p className="text-sm text-[#1A1A1A]">{tx.merchant}</p>
                    <p className="text-xs text-[#ABABAB]">{tx.category}</p>
                  </div>
                  <span className="text-sm font-medium tabular-nums">−{formatCurrency(tx.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
