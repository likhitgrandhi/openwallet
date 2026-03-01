'use client';

import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  subValue?: string;
  className?: string;
  /** When true, renders as inline metric (no card box) — AngelList equity style */
  inline?: boolean;
}

export function StatCard({ title, value, delta, deltaLabel, subValue, className, inline = false }: StatCardProps) {
  const isPositive = delta !== undefined && delta >= 0;

  const content = (
    <>
      <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9E9E9E] mb-2">
        {title}
      </p>
      <p className={cn(
        'font-bold tabular-nums tracking-tight text-[#1A1A1A]',
        inline ? 'text-4xl' : 'text-3xl'
      )}>
        {value}
      </p>
      {subValue && (
        <p className="text-xs text-[#6B6B6B] mt-1">{subValue}</p>
      )}
      {delta !== undefined && (
        <p className={cn(
          'text-xs font-medium mt-1.5',
          isPositive ? 'text-[#1A8A4E]' : 'text-[#D93838]'
        )}>
          {isPositive ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
          {deltaLabel && <span className="text-[#ABABAB] font-normal ml-1">{deltaLabel}</span>}
        </p>
      )}
    </>
  );

  if (inline) {
    return <div className={cn('', className)}>{content}</div>;
  }

  return (
    <div className={cn(
      'bg-white rounded-xl p-6 card-shadow',
      className
    )}>
      {content}
    </div>
  );
}
