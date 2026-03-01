'use client';

import { CATEGORY_COLORS } from '@/lib/data/seed';
import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  category: string;
  className?: string;
  size?: 'sm' | 'md';
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export function CategoryBadge({ category, className, size = 'md' }: CategoryBadgeProps) {
  const color = CATEGORY_COLORS[category] || '#9CA3AF';
  const rgb = hexToRgb(color);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-1.5 py-0 text-xs' : 'px-2 py-0.5 text-xs',
        className
      )}
      style={{
        backgroundColor: `rgba(${rgb}, 0.1)`,
        color: color,
      }}
    >
      {category}
    </span>
  );
}
