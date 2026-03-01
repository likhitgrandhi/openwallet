'use client';

import { useState } from 'react';
import { useSubscriptionStore } from '@/lib/store/useSubscriptionStore';
import { SubscriptionCard } from './SubscriptionCard';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/data/seed';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Subscription } from '@/lib/db/schema';

export function SubscriptionsPageClient() {
  const { subscriptions, addSubscription, updateSubscription, deleteSubscription } = useSubscriptionStore();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    merchant: '',
    amount: '',
    frequency: 'monthly' as 'monthly' | 'annual' | 'weekly',
    nextRenewal: new Date().toISOString().split('T')[0],
    cancelUrl: '',
  });

  const active = subscriptions.filter((s) => s.isActive);
  const inactive = subscriptions.filter((s) => !s.isActive);
  const totalMonthly = active.filter((s) => s.frequency === 'monthly').reduce((sum, s) => sum + s.amount, 0);

  const handleAdd = () => {
    if (!form.merchant || !form.amount) return;
    addSubscription({
      merchant: form.merchant,
      amount: parseFloat(form.amount),
      currency: 'INR',
      frequency: form.frequency,
      nextRenewal: new Date(form.nextRenewal),
      cancelUrl: form.cancelUrl || undefined,
      isActive: true,
      isManual: true,
      detectedFrom: [],
    } as Omit<Subscription, 'id'>);
    setShowAdd(false);
    setForm({ merchant: '', amount: '', frequency: 'monthly', nextRenewal: new Date().toISOString().split('T')[0], cancelUrl: '' });
  };

  return (
    <div className="px-10 py-8 max-w-[1280px]">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[#1A1A1A]">Subscriptions</h1>
          <p className="text-sm text-[#9E9E9E] mt-1">
            {active.length} active · {formatCurrency(totalMonthly)}/month
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-[#173B34] hover:underline mt-2"
        >
          <Plus className="w-3 h-3" />
          Add subscription
        </button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm text-[#9E9E9E] mb-3">No subscriptions detected</p>
          <Button size="sm" onClick={() => setShowAdd(true)}
            className="bg-[#173B34] hover:bg-[#173B34]/90 text-white text-xs">
            Add manually
          </Button>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <>
              <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9E9E9E] mb-4">Active</p>
              <div className="grid grid-cols-3 gap-4 mb-10">
                {active.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    onDelete={deleteSubscription}
                    onToggle={(id, isActive) => updateSubscription(id, { isActive })}
                  />
                ))}
              </div>
            </>
          )}
          {inactive.length > 0 && (
            <>
              <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9E9E9E] mb-4">Paused</p>
              <div className="grid grid-cols-3 gap-4">
                {inactive.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    onDelete={deleteSubscription}
                    onToggle={(id, isActive) => updateSubscription(id, { isActive })}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-base">Add Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div>
              <label className="text-xs font-medium text-[#6B6B6B] mb-1.5 block">Service</label>
              <Input placeholder="Netflix" value={form.merchant}
                onChange={(e) => setForm((f) => ({ ...f, merchant: e.target.value }))}
                className="border-[#E8E8E6]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#6B6B6B] mb-1.5 block">Amount (₹)</label>
                <Input type="number" placeholder="199" value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="border-[#E8E8E6]" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B6B6B] mb-1.5 block">Frequency</label>
                <Select value={form.frequency} onValueChange={(v) => setForm((f) => ({ ...f, frequency: v as typeof form.frequency }))}>
                  <SelectTrigger className="border-[#E8E8E6]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B6B6B] mb-1.5 block">Next Renewal</label>
              <Input type="date" value={form.nextRenewal}
                onChange={(e) => setForm((f) => ({ ...f, nextRenewal: e.target.value }))}
                className="border-[#E8E8E6]" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 border-[#E8E8E6] text-sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button className="flex-1 bg-[#173B34] hover:bg-[#173B34]/90 text-sm" onClick={handleAdd}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
