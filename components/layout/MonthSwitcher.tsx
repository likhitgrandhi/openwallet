'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonth } from '@/lib/data/seed';

interface MonthSwitcherProps {
  currentMonth: string;
}

function offsetMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function MonthSwitcher({ currentMonth }: MonthSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  const navigate = (delta: number) => {
    const newMonth = offsetMonth(currentMonth, delta);
    const newPath = pathname.replace(currentMonth, newMonth);
    router.push(newPath);
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return currentMonth === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => navigate(-1)}
        className="w-6 h-6 flex items-center justify-center rounded text-[#ABABAB] hover:text-[#1A1A1A] hover:bg-[#EFEFED] transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <span className="text-sm text-[#6B6B6B] px-1 tabular-nums min-w-[110px] text-center">
        {formatMonth(currentMonth)}
      </span>
      <button
        onClick={() => navigate(1)}
        disabled={isCurrentMonth()}
        className="w-6 h-6 flex items-center justify-center rounded text-[#ABABAB] hover:text-[#1A1A1A] hover:bg-[#EFEFED] transition-colors disabled:opacity-30 disabled:pointer-events-none"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
