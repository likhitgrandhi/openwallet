'use client';

import { useMemo } from 'react';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { formatCurrency } from '@/lib/data/seed';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function SummaryCard() {
  const { transactions } = useTransactionStore();

  const stats = useMemo(() => {
    if (!transactions.length) return null;

    const totalTransactions = transactions.length;

    const amounts = transactions.map((t) => t.amount);
    const largestTransaction = Math.max(...amounts);

    const totalIncome = transactions
      .filter((t) => t.type === 'credit')
      .reduce((s, t) => s + t.amount, 0);

    const totalSpending = transactions
      .filter((t) => t.type === 'debit')
      .reduce((s, t) => s + t.amount, 0);

    const avgTransaction = totalIncome - totalSpending;
    const avgPerTransaction = avgTransaction / totalTransactions;

    const dates = transactions.map((t) =>
      t.date instanceof Date ? t.date : new Date(t.date)
    );
    const firstTransaction = new Date(Math.min(...dates.map((d) => d.getTime())));
    const lastTransaction = new Date(Math.max(...dates.map((d) => d.getTime())));

    return {
      totalTransactions,
      largestTransaction,
      avgPerTransaction,
      totalIncome,
      totalSpending,
      firstTransaction,
      lastTransaction,
    };
  }, [transactions]);

  const rows: { label: string; value: string; positive?: boolean }[] = stats
    ? [
        {
          label: 'Total transactions',
          value: stats.totalTransactions.toLocaleString(),
        },
        {
          label: 'Largest transaction',
          value: formatCurrency(stats.largestTransaction),
        },
        {
          label: 'Average transaction',
          value:
            (stats.avgPerTransaction >= 0 ? '+' : '') +
            formatCurrency(Math.abs(stats.avgPerTransaction)),
          positive: stats.avgPerTransaction >= 0,
        },
        {
          label: 'Total income',
          value: '+' + formatCurrency(stats.totalIncome),
          positive: true,
        },
        {
          label: 'Total spending',
          value: formatCurrency(stats.totalSpending),
        },
        {
          label: 'First transaction',
          value: formatDate(stats.firstTransaction),
        },
        {
          label: 'Last transaction',
          value: formatDate(stats.lastTransaction),
        },
      ]
    : [];

  return (
    <div className="bento-card flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-5">
        <p
          className="font-semibold"
          style={{ fontSize: 18, letterSpacing: '-0.02em', color: '#0A0A0A' }}
        >
          Summary
        </p>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #E4E4E4', marginLeft: 24, marginRight: 24 }} />

      {/* Rows */}
      <div className="px-6 py-2 flex flex-col divide-y divide-[#F0F0F0]">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between"
            style={{ paddingTop: 14, paddingBottom: 14 }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 400,
                color: '#525252',
                letterSpacing: 0,
              }}
            >
              {row.label}
            </span>
            <span
              className="font-numbers"
              style={{
                fontSize: 14,
                fontWeight: row.label === 'Last transaction' || row.label === 'First transaction' ? 600 : 500,
                color: row.positive ? '#0BAF6B' : '#0A0A0A',
                letterSpacing: '-0.01em',
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"',
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {!stats && (
        <div className="flex-1 flex items-center justify-center">
          <p style={{ fontSize: 13, color: '#8A8A8A' }}>No transactions yet</p>
        </div>
      )}
    </div>
  );
}
