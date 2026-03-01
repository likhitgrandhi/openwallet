'use client';

import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { formatCurrency, formatMonth } from '@/lib/data/seed';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line,
} from 'recharts';

const PALETTE = [
  '#173B34', '#C4B4E8', '#E2CFA0', '#8C6A42',
  '#2D8B62', '#9FC0C8', '#5B5EA8', '#D4788A',
];

function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{value: number; name: string; color: string}>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1A1A] text-white px-3 py-2.5 rounded-lg text-xs space-y-1">
      <p className="text-[#9E9E9E] mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: p.color }} />
          <span className="text-[#ABABAB]">{p.name === 'income' ? 'Income' : p.name === 'expenses' ? 'Expenses' : p.name}</span>
          <span className="ml-1 font-medium">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function OverviewPageClient() {
  const { getAllMonths, getMonthlyStats, getCategoryBreakdown } = useTransactionStore();
  const months = getAllMonths().slice(0, 6).reverse();

  const trendData = months.map((month) => {
    const stats = getMonthlyStats(month);
    return {
      month: formatMonth(month).replace(/\s\d{4}/, ''),
      income: stats.totalIncome,
      expenses: stats.totalExpenses,
      savings: stats.savings,
      savingsRate: stats.savingsRate,
    };
  });

  const allBreakdowns = months.flatMap((m) => getCategoryBreakdown(m));
  const categoryTotals: Record<string, number> = {};
  for (const b of allBreakdowns) {
    categoryTotals[b.category] = (categoryTotals[b.category] || 0) + b.amount;
  }
  const topCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const totalStats = months.reduce((acc, m) => {
    const s = getMonthlyStats(m);
    return { income: acc.income + s.totalIncome, expenses: acc.expenses + s.totalExpenses, savings: acc.savings + s.savings };
  }, { income: 0, expenses: 0, savings: 0 });

  const avgSavingsRate = months.length > 0
    ? months.reduce((acc, m) => acc + getMonthlyStats(m).savingsRate, 0) / months.length : 0;

  const metricStyle = "border-r border-[#E8E8E6] pr-10 mr-10 last:border-0";

  return (
    <div className="px-10 py-8 max-w-[1280px]">
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight text-[#1A1A1A]">Overview</h1>
        <p className="text-sm text-[#9E9E9E] mt-1">Last {months.length} months</p>
      </div>

      {/* Top metrics — AngelList equity style */}
      <div className="flex items-start mb-10">
        {[
          { label: 'Total Income', value: formatCurrency(totalStats.income) },
          { label: 'Total Spending', value: formatCurrency(totalStats.expenses) },
          { label: 'Net Savings', value: formatCurrency(totalStats.savings) },
          { label: 'Avg Savings Rate', value: `${avgSavingsRate.toFixed(1)}%` },
        ].map((m, i, arr) => (
          <div key={m.label} className={i < arr.length - 1 ? metricStyle : ''}>
            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9E9E9E] mb-2">{m.label}</p>
            <p className="text-4xl font-bold tabular-nums tracking-tight text-[#1A1A1A]">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-[#E8E8E6] mb-8" />

      {/* Income vs Expenses */}
      <div className="mb-8">
        <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9E9E9E] mb-6">Income vs Expenses</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trendData} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2D8B62" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#2D8B62" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#173B34" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#173B34" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#F0F0EE" vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9E9E9E' }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: '#9E9E9E' }}
              axisLine={false} tickLine={false} width={44}
            />
            <Tooltip content={<DarkTooltip />} />
            <Area type="monotone" dataKey="income" stroke="#2D8B62" strokeWidth={1.5} fill="url(#incGrad)" dot={false} name="income" />
            <Area type="monotone" dataKey="expenses" stroke="#173B34" strokeWidth={1.5} fill="url(#expGrad)" dot={false} name="expenses" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-5 gap-8">
        {/* Savings Rate */}
        <div className="col-span-3">
          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9E9E9E] mb-5">Savings Rate</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={trendData} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
              <CartesianGrid stroke="#F0F0EE" vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9E9E9E' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => `${(v as number).toFixed(0)}%`}
                tick={{ fontSize: 11, fill: '#9E9E9E' }}
                axisLine={false} tickLine={false} width={32}
              />
              <Tooltip
                formatter={(v) => [`${(v as number).toFixed(1)}%`, 'Savings Rate']}
                contentStyle={{ background: '#1A1A1A', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#fff', boxShadow: 'none' }}
                itemStyle={{ color: '#ABABAB' }}
              />
              <Line type="monotone" dataKey="savingsRate" stroke="#173B34" strokeWidth={1.5}
                dot={{ r: 3, fill: '#173B34', strokeWidth: 0 }} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top categories */}
        <div className="col-span-2">
          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9E9E9E] mb-5">Top Categories</p>
          <div className="space-y-3">
            {topCategories.map(([category, total], i) => (
              <div key={category} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                  />
                  <span className="text-sm text-[#6B6B6B]">{category}</span>
                </div>
                <span className="text-sm font-medium tabular-nums text-[#1A1A1A]">{formatCurrency(total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
