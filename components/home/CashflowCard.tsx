'use client';

import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { formatCurrency } from '@/lib/data/seed';
import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from 'recharts';

interface CashflowCardProps {
  month: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Income':            '#2d8b62',
  'Savings':           '#5b5ea8',
  'Expenses':          '#9fc0c8',
  'Housing':           '#01291e',
  'Food & Dining':     '#8c6a42',
  'Auto & Transport':  '#9fc0c8',
  'Shopping':          '#d4788a',
  'Subscriptions':     '#c4b4e8',
  'Health & Wellness': '#2d8b62',
  'Entertainment':     '#e2cfa0',
  'Travel & Vacation': '#9fc0c8',
  'Education':         '#8c6a42',
  'Investments':       '#5b5ea8',
  'Other':             '#c0c0c0',
};

function getColor(name: string) {
  return CATEGORY_COLORS[name] ?? '#c0c0c0';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomNode({ x, y, width, height, index, payload }: any) {
  const color = getColor(payload.name);
  const isLeft = index === 0;
  return (
    <Layer key={`node-${index}`}>
      <Rectangle
        x={x} y={y} width={width} height={height}
        fill={color} fillOpacity={0.9} radius={3}
      />
      <text
        x={isLeft ? x - 8 : x + width + 8}
        y={y + height / 2}
        textAnchor={isLeft ? 'end' : 'start'}
        dominantBaseline="middle"
        fill="#474747"
        fontSize={11}
        fontWeight={500}
      >
        {payload.name}
      </text>
    </Layer>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const link = payload[0]?.payload;
  if (!link?.source) return null;
  return (
    <div className="bg-white border border-[#ebebeb] rounded-xl px-3 py-2 text-xs shadow-sm">
      <p className="text-[#474747] font-medium">{link.source.name} → {link.target.name}</p>
      <p className="font-numbers font-semibold text-[#01291e] mt-0.5">{formatCurrency(link.value)}</p>
    </div>
  );
}

export function CashflowCard({ month }: CashflowCardProps) {
  const { getCategoryBreakdown, getMonthlyStats } = useTransactionStore();
  const stats = getMonthlyStats(month);
  const breakdown = getCategoryBreakdown(month);

  const totalIncome = stats.totalIncome;
  const totalExpenses = stats.totalExpenses;
  const savings = Math.max(totalIncome - totalExpenses, 0);

  // Build Sankey data
  // Nodes: Income, Savings, Expenses, ...categories
  // Links: Income→Savings, Income→Expenses, Expenses→Category...
  const categoryRows = breakdown
    .filter((b) => b.category !== 'Income' && b.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const nodeNames = ['Income', ...(savings > 0 ? ['Savings'] : []), 'Expenses', ...categoryRows.map((c) => c.category)];
  const nodeMap: Record<string, number> = Object.fromEntries(nodeNames.map((n, i) => [n, i]));

  const links = [
    ...(savings > 0 ? [{ source: nodeMap['Income'], target: nodeMap['Savings'], value: savings }] : []),
    { source: nodeMap['Income'], target: nodeMap['Expenses'], value: totalExpenses || 1 },
    ...categoryRows.map((c) => ({
      source: nodeMap['Expenses'],
      target: nodeMap[c.category],
      value: c.amount,
    })),
  ];

  const data = {
    nodes: nodeNames.map((name) => ({ name })),
    links,
  };

  if (totalIncome === 0 && totalExpenses === 0) {
    return (
      <div className="bento-card p-5 flex flex-col h-full">
        <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#c0c0c0] shrink-0 mb-4">
          Cash Flow
        </span>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[#c0c0c0]">No transactions this month</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bento-card p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#c0c0c0]">
          Cash Flow
        </span>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-[#c0c0c0]">
            In <span className="font-numbers font-semibold text-[#2d8b62]">{formatCurrency(totalIncome)}</span>
          </span>
          <span className="text-[#c0c0c0]">
            Out <span className="font-numbers font-semibold text-[#01291e]">{formatCurrency(totalExpenses)}</span>
          </span>
          {savings > 0 && (
            <span className="text-[#c0c0c0]">
              Saved <span className="font-numbers font-semibold text-[#5b5ea8]">{formatCurrency(savings)}</span>
            </span>
          )}
        </div>
      </div>
      <div className="flex-1" style={{ minHeight: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={data}
            nodePadding={16}
            nodeWidth={10}
            margin={{ left: 80, right: 120, top: 10, bottom: 10 }}
            link={{ stroke: '#e6e6e6', strokeOpacity: 0.5 }}
            node={<CustomNode />}
          >
            <Tooltip content={<CustomTooltipContent />} />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
