'use client';

import { useState } from 'react';
import { useSubscriptionStore } from '@/lib/store/useSubscriptionStore';
import { formatCurrency } from '@/lib/data/seed';
import { Subscription } from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import { Plus, X, Check, Pencil, Trash2, Power } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SubscriptionsCardProps {
  onAdd?: () => void;
}

function SubForm({
  initial,
  onSave,
  onCancel,
  title,
}: {
  initial?: Partial<Subscription>;
  onSave: (data: Omit<Subscription, 'id'>) => void;
  onCancel: () => void;
  title: string;
}) {
  const [merchant, setMerchant] = useState(initial?.merchant ?? '');
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : '');
  const [frequency, setFrequency] = useState<Subscription['frequency']>(initial?.frequency ?? 'monthly');
  const [nextRenewal, setNextRenewal] = useState(
    initial?.nextRenewal ? new Date(initial.nextRenewal).toISOString().split('T')[0] : ''
  );

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!merchant.trim() || isNaN(amt) || amt <= 0 || !nextRenewal) return;
    onSave({
      merchant: merchant.trim(),
      amount: amt,
      currency: 'INR',
      frequency,
      nextRenewal: new Date(nextRenewal),
      isActive: initial?.isActive ?? true,
      isManual: true,
      detectedFrom: initial?.detectedFrom ?? [],
      logoUrl: initial?.logoUrl,
    });
  };

  return (
    <div className="p-3 rounded-[10px] border border-[#E4E4E4] bg-[#F7F7F7] space-y-2.5">
      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#8A8A8A]">{title}</p>
      <input
        type="text"
        placeholder="Service name (e.g. Netflix)"
        value={merchant}
        onChange={(e) => setMerchant(e.target.value)}
        className="w-full px-2.5 py-1.5 text-[12px] font-medium text-[#0A0A0A] border border-[#E4E4E4] rounded-[6px] bg-white focus:outline-none focus:border-[#0A0A0A]"
        autoFocus
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#8A8A8A]">₹</span>
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full pl-6 pr-2.5 py-1.5 text-[12px] font-medium text-[#0A0A0A] border border-[#E4E4E4] rounded-[6px] bg-white focus:outline-none focus:border-[#0A0A0A]"
          />
        </div>
        <Select value={frequency} onValueChange={(v) => setFrequency(v as Subscription['frequency'])}>
          <SelectTrigger className="h-[34px] text-xs border-[#E4E4E4] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
            <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
            <SelectItem value="annual" className="text-xs">Annual</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-[11px] text-[#8A8A8A] mb-1 block">Next renewal</label>
        <input
          type="date"
          value={nextRenewal}
          onChange={(e) => setNextRenewal(e.target.value)}
          className="w-full px-2.5 py-1.5 text-[12px] font-medium text-[#0A0A0A] border border-[#E4E4E4] rounded-[6px] bg-white focus:outline-none focus:border-[#0A0A0A]"
        />
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} className="text-[11px] font-medium text-white bg-[#0A0A0A] px-3 py-1 rounded-[6px] hover:bg-[#2C2C2C] transition-colors flex items-center gap-1.5"><Check size={11} /> Save</button>
        <button onClick={onCancel} className="text-[11px] font-medium text-[#525252] px-3 py-1 rounded-[6px] border border-[#E4E4E4] hover:bg-white transition-colors flex items-center gap-1.5"><X size={11} /> Cancel</button>
      </div>
    </div>
  );
}

export function SubscriptionsCard({ onAdd }: SubscriptionsCardProps) {
  const { subscriptions, addSubscription, updateSubscription, deleteSubscription } = useSubscriptionStore();
  const active = subscriptions.filter((s) => s.isActive);
  const inactive = subscriptions.filter((s) => !s.isActive);
  const totalMonthly = active.filter((s) => s.frequency === 'monthly').reduce((sum, s) => sum + s.amount, 0);

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = (data: Omit<Subscription, 'id'>) => {
    addSubscription(data, true);
    setShowAdd(false);
  };

  const handleEdit = (id: string, data: Omit<Subscription, 'id'>) => {
    updateSubscription(id, data, true);
    setEditingId(null);
  };

  const renderSub = (sub: Subscription) => {
    if (editingId === sub.id) {
      return (
        <SubForm
          key={sub.id}
          title="Edit Subscription"
          initial={sub}
          onSave={(data) => handleEdit(sub.id, data)}
          onCancel={() => setEditingId(null)}
        />
      );
    }

    return (
      <div key={sub.id} className={cn('flex items-center justify-between group', !sub.isActive && 'opacity-50')}>
        <div className="flex items-center gap-2.5 min-w-0">
          {sub.logoUrl ? (
            <img
              src={sub.logoUrl}
              alt={sub.merchant}
              className="size-7 rounded-lg object-contain border border-[#e6e6e6] shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="size-7 rounded-lg bg-[#F0F0F0] border border-[#E4E4E4] flex items-center justify-center shrink-0">
              <span className="text-[10px] font-semibold text-[#525252]">{sub.merchant.charAt(0)}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm text-[#0A0A0A] font-medium truncate">{sub.merchant}</p>
            <p className="text-[10px] text-[#8A8A8A]">
              {new Date(sub.nextRenewal).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {sub.frequency}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-numbers text-sm font-medium text-[#0A0A0A] tabular-nums">
            {formatCurrency(sub.amount)}
          </span>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ml-1">
            <button
              onClick={() => updateSubscription(sub.id, { isActive: !sub.isActive }, true)}
              className={cn('w-5 h-5 flex items-center justify-center rounded transition-colors', sub.isActive ? 'hover:bg-[#FFF5F5] text-[#8A8A8A] hover:text-[#E53E3E]' : 'hover:bg-[#EDFCF5] text-[#8A8A8A] hover:text-[#0BAF6B]')}
              title={sub.isActive ? 'Pause' : 'Activate'}
            >
              <Power size={10} />
            </button>
            <button onClick={() => setEditingId(sub.id)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#F0F0F0] text-[#8A8A8A] hover:text-[#0A0A0A] transition-colors">
              <Pencil size={10} />
            </button>
            <button onClick={() => deleteSubscription(sub.id, true)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#FFF5F5] text-[#8A8A8A] hover:text-[#E53E3E] transition-colors">
              <Trash2 size={10} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bento-card p-6 flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[16px] font-semibold text-[#0A0A0A] tracking-[-0.02em]">
          Subscriptions <span className="text-[#8A8A8A] text-sm font-normal">({active.length})</span>
        </p>
        <div className="flex items-center gap-2">
          <span className="font-numbers text-sm font-medium text-[#0A0A0A]">
            {formatCurrency(totalMonthly)}<span className="text-[#8A8A8A] font-normal text-xs">/mo</span>
          </span>
          <button
            onClick={() => { setShowAdd((v) => !v); setEditingId(null); }}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-[#F0F0F0]"
            title="Add subscription"
          >
            <Plus size={15} strokeWidth={2} color="#525252" />
          </button>
        </div>
      </div>

      <div className="space-y-3 overflow-auto flex-1">
        {showAdd && (
          <SubForm title="New Subscription" onSave={handleAdd} onCancel={() => setShowAdd(false)} />
        )}

        {subscriptions.length === 0 && !showAdd ? (
          <div className="text-center py-6">
            <p className="text-sm text-[#8A8A8A] mb-2">No subscriptions tracked</p>
            <button
              onClick={() => setShowAdd(true)}
              className="text-[12px] font-medium text-[#0A0A0A] border border-[#E4E4E4] rounded-[6px] px-3 py-1.5 hover:bg-[#F7F7F7] transition-colors"
            >
              + Add first subscription
            </button>
          </div>
        ) : (
          <>
            {active.map(renderSub)}
            {inactive.length > 0 && (
              <div className="pt-2 border-t border-[#F0F0F0]">
                <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#8A8A8A] mb-2">Paused</p>
                {inactive.map(renderSub)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
