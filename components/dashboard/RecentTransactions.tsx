'use client';

import Link from 'next/link';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { formatCurrency } from '@/lib/data/seed';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

interface RecentTransactionsProps {
  month: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function RecentTransactions({ month }: RecentTransactionsProps) {
  const { getFilteredTransactions } = useTransactionStore();
  const transactions = getFilteredTransactions({ month }).slice(0, 6);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9E9E9E]">
          Recent Transactions
        </p>
        <Link
          href={`/${month}/transactions`}
          className="text-xs text-[#173B34] hover:underline flex items-center gap-0.5"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-4 pb-2 border-b border-[#E8E8E6]">
        <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#ABABAB]">Merchant</span>
        <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#ABABAB]">Date</span>
        <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#ABABAB] text-right">Amount</span>
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-[#ABABAB] py-8 text-center">No transactions this month</p>
      ) : (
        <div>
          {transactions.map((tx, i) => (
            <div
              key={tx.id}
              className={cn(
                'grid grid-cols-[1fr_auto_auto] gap-4 items-center py-3',
                i < transactions.length - 1 && 'border-b border-[#F0F0EE]'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-[#F0F0EE] flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-semibold text-[#6B6B6B]">
                    {tx.merchant.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-[#1A1A1A] truncate">{tx.merchant}</p>
                  <p className="text-[11px] text-[#ABABAB]">{tx.category}</p>
                </div>
              </div>
              <span className="text-xs text-[#9E9E9E] tabular-nums whitespace-nowrap">
                {formatDate(tx.date)}
              </span>
              <span className={cn(
                'text-sm font-medium tabular-nums text-right',
                tx.type === 'credit' ? 'text-[#1A8A4E]' : 'text-[#1A1A1A]'
              )}>
                {tx.type === 'credit' ? '+' : '−'}{formatCurrency(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
