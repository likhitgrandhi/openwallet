'use client';

import { Subscription } from '@/lib/db/schema';
import { formatCurrency } from '@/lib/data/seed';
import { Button } from '@/components/ui/button';
import { ExternalLink, Trash2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionCardProps {
  subscription: Subscription;
  onDelete?: (id: string) => void;
  onToggle?: (id: string, isActive: boolean) => void;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getFrequencyLabel(freq: string): string {
  return { monthly: 'Monthly', annual: 'Yearly', weekly: 'Weekly' }[freq] || freq;
}

export function SubscriptionCard({ subscription: sub, onDelete, onToggle }: SubscriptionCardProps) {
  return (
    <div className={cn(
      'bg-white rounded-xl card-shadow p-5 flex flex-col gap-3 group',
      !sub.isActive && 'opacity-50'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {sub.logoUrl ? (
            <img
              src={sub.logoUrl}
              alt={sub.merchant}
              className="w-8 h-8 rounded-lg object-contain border border-[#F0F0EE]"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[#F0F0EE] flex items-center justify-center">
              <span className="text-xs font-semibold text-[#6B6B6B]">{sub.merchant.charAt(0)}</span>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-[#1A1A1A]">{sub.merchant}</p>
            <p className="text-xs text-[#9E9E9E]">{getFrequencyLabel(sub.frequency)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-base font-bold tabular-nums text-[#1A1A1A]">{formatCurrency(sub.amount)}</p>
          <p className="text-[10px] text-[#9E9E9E]">/ month</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#F0F0EE]">
        <div>
          <p className="text-[10px] text-[#ABABAB] uppercase tracking-wider">Renews</p>
          <p className="text-xs font-medium text-[#6B6B6B] mt-0.5">{formatDate(sub.nextRenewal)}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {sub.cancelUrl && (
            <a
              href={sub.cancelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-[#173B34] hover:underline font-medium"
            >
              Cancel <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
          {onToggle && (
            <button
              onClick={() => onToggle(sub.id, !sub.isActive)}
              className="ml-2 text-[#ABABAB] hover:text-[#6B6B6B]"
              title={sub.isActive ? 'Pause' : 'Activate'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(sub.id)}
              className="ml-1 text-[#ABABAB] hover:text-[#D93838]"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
