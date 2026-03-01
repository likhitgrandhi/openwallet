'use client';

import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { formatCurrency } from '@/lib/data/seed';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// AngelList earthy chart palette
const PALETTE = [
  '#173B34', '#C4B4E8', '#E2CFA0', '#8C6A42',
  '#2D8B62', '#9FC0C8', '#5B5EA8', '#D4788A',
];

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1A1A] text-white px-3 py-2 rounded-lg text-xs">
      <p className="font-medium">{label}</p>
      <p className="text-[#ABABAB] mt-0.5">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

interface SpendingByCategoryProps {
  month: string;
}

export function SpendingByCategory({ month }: SpendingByCategoryProps) {
  const { getCategoryBreakdown } = useTransactionStore();
  const data = getCategoryBreakdown(month);

  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9E9E9E] mb-5">
        Spending by Category
      </p>
      {data.length === 0 ? (
        <p className="text-sm text-[#ABABAB] py-12 text-center">No expenses this month</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 0, right: 8, top: 0, bottom: 0 }}
              barCategoryGap="30%"
            >
              <XAxis
                type="number"
                hide
                domain={[0, 'dataMax']}
              />
              <YAxis
                type="category"
                dataKey="category"
                width={120}
                tick={{ fontSize: 12, fill: '#6B6B6B', fontWeight: 400 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="amount" radius={[0, 3, 3, 0]} maxBarSize={20}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Legend row */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4">
            {data.map((d, i) => (
              <div key={d.category} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                />
                <span className="text-xs text-[#6B6B6B]">{d.category}</span>
                <span className="text-xs font-medium text-[#1A1A1A] tabular-nums">
                  {d.percentage.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
