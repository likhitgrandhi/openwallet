'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { useBudgetStore } from '@/lib/store/useBudgetStore';
import { useSubscriptionStore } from '@/lib/store/useSubscriptionStore';
import { useCategoryStore } from '@/lib/store/useCategoryStore';
import { useThemeStore } from '@/lib/store/useThemeStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download01Icon, CloudUploadIcon, Delete02Icon, Alert01Icon } from '@hugeicons/core-free-icons';
import { clearAllData } from '@/lib/db/clear';
import { cn } from '@/lib/utils';
import { Pencil, Trash2, Check, X, Plus } from 'lucide-react';

function safeDate(d: Date | string): string {
  const dt = d instanceof Date ? d : new Date(d);
  return isNaN(dt.getTime()) ? '' : dt.toISOString().split('T')[0];
}

const PRESET_COLORS = [
  '#0A0A0A', '#E53E3E', '#D97706', '#16A34A', '#0BAF6B',
  '#0891B2', '#2563EB', '#4F46E5', '#7C3AED', '#9333EA',
  '#DB2777', '#6B7280', '#059669', '#9CA3AF',
];

function ColorDot({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-5 h-5 rounded-full border-2 transition-all',
        selected ? 'border-[#0A0A0A] scale-110' : 'border-transparent hover:scale-105'
      )}
      style={{ background: color }}
      title={color}
    />
  );
}

export function SettingsPageClient() {
  const { transactions, loadSeedData } = useTransactionStore();
  const { loadSeedData: loadBudgetSeed } = useBudgetStore();
  const { loadSeedData: loadSubSeed } = useSubscriptionStore();
  const { categories, addCategory, updateCategory, deleteCategory } = useCategoryStore();
  const { theme, setTheme } = useThemeStore();

  const [showClearDialog, setShowClearDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [clearing, setClearing] = useState(false);

  // Category editing state
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[3]);
  const [addError, setAddError] = useState('');

  const handleExportCSV = () => {
    const headers = ['Date', 'Merchant', 'Category', 'Amount', 'Type', 'Account', 'Bank'];
    const rows = transactions.map((tx) => [
      safeDate(tx.date), `"${tx.merchant}"`, tx.category,
      tx.amount, tx.type, `"${tx.account}"`, tx.bank,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleExportJSON = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(transactions, null, 2)], { type: 'application/json' }));
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleClearAll = async () => {
    setClearing(true);
    await clearAllData();
    loadSeedData();
    loadBudgetSeed();
    loadSubSeed();
    window.location.reload();
  };

  const startEditCat = (name: string, color: string) => {
    setEditingCat(name);
    setEditName(name);
    setEditColor(color);
    setShowAddCat(false);
  };

  const saveEditCat = () => {
    if (!editingCat) return;
    updateCategory(editingCat, editName, editColor);
    setEditingCat(null);
  };

  const handleAddCat = () => {
    setAddError('');
    if (!newCatName.trim()) { setAddError('Name is required'); return; }
    const ok = addCategory(newCatName, newCatColor);
    if (!ok) { setAddError('Category already exists'); return; }
    setNewCatName('');
    setNewCatColor(PRESET_COLORS[3]);
    setShowAddCat(false);
  };

  return (
    <div className="min-h-screen py-[40px]">
      <div className="max-w-[1180px] mx-auto px-6 pl-[72px]">
        <div className="mb-10">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A] mb-2">Manage your</p>
          <h1 className="font-bold text-[28px] leading-[1.2] text-[#0A0A0A]" style={{ letterSpacing: '-0.03em' }}>
            Settings
          </h1>
        </div>

        <Tabs defaultValue="data">
          <TabsList variant="angellist" className="w-full justify-start mb-8">
            {['data', 'categories', 'appearance', 'privacy'].map((tab) => (
              <TabsTrigger key={tab} value={tab} className="capitalize text-[14px]">{tab}</TabsTrigger>
            ))}
          </TabsList>

          {/* Data tab */}
          <TabsContent value="data" className="mt-0 space-y-6">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A] mb-3">Export</p>
              <p className="text-[14px] text-[#525252] mb-4">{transactions.length} transactions stored on this device</p>
              <div className="flex gap-3">
                {[{ label: 'Export CSV', fn: handleExportCSV }, { label: 'Export JSON', fn: handleExportJSON }].map(({ label, fn }) => (
                  <button key={label} onClick={fn}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-[#0A0A0A] border border-[#E4E4E4] rounded-[8px] px-3 py-2 bg-white hover:bg-[#F7F7F7] hover:border-[#C4C4C4] transition-colors">
                    <HugeiconsIcon icon={Download01Icon} size={14} strokeWidth={1.5} /> {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A] mb-3">Import</p>
              <button className="flex items-center gap-1.5 text-[12px] font-medium text-[#525252] border border-[#E4E4E4] rounded-[8px] px-3 py-2 bg-white hover:bg-[#F7F7F7] hover:border-[#C4C4C4] transition-colors">
                <HugeiconsIcon icon={CloudUploadIcon} size={14} strokeWidth={1.5} /> Choose CSV file
              </button>
            </div>
            <div className="pt-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#E53E3E] mb-3">Danger Zone</p>
              <button onClick={() => setShowClearDialog(true)}
                className="flex items-center gap-1.5 text-[12px] font-medium text-[#E53E3E] border border-[#E53E3E]/30 rounded-[8px] px-3 py-2 bg-[#FFF5F5] hover:bg-[#FFF5F5]/80 transition-colors">
                <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.5} /> Clear all data
              </button>
            </div>
          </TabsContent>

          {/* Categories tab */}
          <TabsContent value="categories" className="mt-0 max-w-md">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[14px] font-medium text-[#0A0A0A]">{categories.length} categories</p>
              <button
                onClick={() => { setShowAddCat((v) => !v); setEditingCat(null); setNewCatName(''); setAddError(''); }}
                className="flex items-center gap-1.5 text-[12px] font-medium text-[#0A0A0A] border border-[#E4E4E4] rounded-[6px] px-2.5 py-1.5 bg-white hover:bg-[#F7F7F7] transition-colors"
              >
                <Plus size={12} /> Add category
              </button>
            </div>

            {/* Add category form */}
            {showAddCat && (
              <div className="mb-4 p-3 rounded-[10px] border border-[#E4E4E4] bg-[#F7F7F7] space-y-2.5">
                <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#8A8A8A]">New Category</p>
                <input
                  type="text"
                  placeholder="Category name…"
                  value={newCatName}
                  onChange={(e) => { setNewCatName(e.target.value); setAddError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddCat(); if (e.key === 'Escape') setShowAddCat(false); }}
                  className={cn('w-full px-2.5 py-1.5 text-[12px] font-medium text-[#0A0A0A] border rounded-[6px] bg-white focus:outline-none focus:border-[#0A0A0A]', addError ? 'border-[#E53E3E]' : 'border-[#E4E4E4]')}
                  autoFocus
                />
                {addError && <p className="text-[11px] text-[#E53E3E]">{addError}</p>}
                <div>
                  <p className="text-[11px] text-[#8A8A8A] mb-1.5">Color</p>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((c) => (
                      <ColorDot key={c} color={c} selected={newCatColor === c} onClick={() => setNewCatColor(c)} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddCat} className="text-[11px] font-medium text-white bg-[#0A0A0A] px-3 py-1 rounded-[6px] hover:bg-[#2C2C2C] transition-colors flex items-center gap-1"><Check size={11} /> Add</button>
                  <button onClick={() => setShowAddCat(false)} className="text-[11px] font-medium text-[#525252] px-3 py-1 rounded-[6px] border border-[#E4E4E4] hover:bg-white transition-colors flex items-center gap-1"><X size={11} /> Cancel</button>
                </div>
              </div>
            )}

            {/* Category list */}
            <div className="border border-[#E4E4E4] rounded-[10px] overflow-hidden">
              {categories.map((cat, i) => {
                const txCount = transactions.filter((t) => t.category === cat.name).length;
                const isEditing = editingCat === cat.name;

                return (
                  <div
                    key={cat.name}
                    className={cn(
                      'group',
                      i < categories.length - 1 ? 'border-b border-[#E4E4E4]' : ''
                    )}
                  >
                    {isEditing ? (
                      <div className="p-3 bg-[#F7F7F7] space-y-2.5">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveEditCat(); if (e.key === 'Escape') setEditingCat(null); }}
                          className="w-full px-2.5 py-1.5 text-[12px] font-medium text-[#0A0A0A] border border-[#E4E4E4] rounded-[6px] bg-white focus:outline-none focus:border-[#0A0A0A]"
                          autoFocus
                        />
                        <div>
                          <p className="text-[11px] text-[#8A8A8A] mb-1.5">Color</p>
                          <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map((c) => (
                              <ColorDot key={c} color={c} selected={editColor === c} onClick={() => setEditColor(c)} />
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={saveEditCat} className="text-[11px] font-medium text-white bg-[#0A0A0A] px-3 py-1 rounded-[6px] hover:bg-[#2C2C2C] transition-colors flex items-center gap-1"><Check size={11} /> Save</button>
                          <button onClick={() => setEditingCat(null)} className="text-[11px] font-medium text-[#525252] px-3 py-1 rounded-[6px] border border-[#E4E4E4] hover:bg-white transition-colors flex items-center gap-1"><X size={11} /> Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                          <span className="text-[14px] text-[#0A0A0A]">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-numbers text-[12px] text-[#8A8A8A] tabular-nums">{txCount}</span>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                            <button
                              onClick={() => startEditCat(cat.name, cat.color)}
                              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#F0F0F0] text-[#8A8A8A] hover:text-[#0A0A0A] transition-colors"
                            >
                              <Pencil size={11} />
                            </button>
                            <button
                              onClick={() => deleteCategory(cat.name)}
                              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#FFF5F5] text-[#8A8A8A] hover:text-[#E53E3E] transition-colors"
                              title={txCount > 0 ? `${txCount} transactions use this category` : 'Delete'}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Appearance tab */}
          <TabsContent value="appearance" className="mt-0 max-w-md space-y-8">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A] mb-4">Theme</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  {
                    id: 'default',
                    label: 'Default',
                    description: 'Clean white, minimal',
                    preview: '#FFFFFF',
                  },
                  {
                    id: 'modern',
                    label: 'Modern',
                    description: 'Warm off-white, soft shadows',
                    preview: '#FBFAF9',
                  },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={cn(
                      'relative flex flex-col gap-2.5 p-3.5 rounded-[12px] border-2 text-left transition-all',
                      theme === t.id
                        ? 'border-[#0A0A0A] bg-white'
                        : 'border-[#E4E4E4] bg-white hover:border-[#C4C4C4]'
                    )}
                  >
                    {/* Mini preview */}
                    <div
                      className="w-full h-16 rounded-[8px] border border-[#E4E4E4] flex flex-col gap-1 p-2"
                      style={{ background: t.preview }}
                    >
                      <div className="flex gap-1.5">
                        <div className="h-2 rounded-full bg-[#E4E4E4] w-8" />
                        <div className="h-2 rounded-full bg-[#E4E4E4] flex-1" />
                      </div>
                      <div className="flex gap-1.5 mt-0.5">
                        <div
                          className="flex-1 h-6 rounded-[4px] border"
                          style={{
                            background: '#FFFFFF',
                            borderColor: '#E4E4E4',
                            boxShadow: t.id === 'modern' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                          }}
                        />
                        <div
                          className="flex-1 h-6 rounded-[4px] border"
                          style={{
                            background: '#FFFFFF',
                            borderColor: '#E4E4E4',
                            boxShadow: t.id === 'modern' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-[#0A0A0A]">{t.label}</p>
                        {theme === t.id && (
                          <span className="w-4 h-4 rounded-full bg-[#0A0A0A] flex items-center justify-center shrink-0">
                            <Check size={9} color="white" strokeWidth={2.5} />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#8A8A8A] mt-0.5">{t.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Privacy tab */}
          <TabsContent value="privacy" className="mt-0 max-w-md space-y-5">
            <ul className="space-y-3">
              {[
                'All financial data is stored locally in your browser (IndexedDB)',
                'No transaction data is ever sent to any server',
                'Gmail access is read-only, revocable anytime from Google Account',
              ].map((p, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14px] text-[#525252] leading-[1.5]">
                  <span className="w-1 h-1 rounded-full bg-[#0BAF6B] mt-2 shrink-0" />{p}
                </li>
              ))}
            </ul>
            <button className="text-[12px] font-medium text-[#525252] border border-[#E4E4E4] rounded-[8px] px-3 py-2 bg-white hover:bg-[#F7F7F7] hover:border-[#C4C4C4] transition-colors">
              Revoke Gmail Access
            </button>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#E53E3E] text-base">
              <HugeiconsIcon icon={Alert01Icon} size={16} strokeWidth={1.5} /> Clear all data?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#474747]">Type <strong>DELETE</strong> to permanently remove all {transactions.length} transactions.</p>
          <Input placeholder="DELETE" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="border-[#e6e6e6]" />
          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-[#e6e6e6]" onClick={() => setShowClearDialog(false)}>Cancel</Button>
            <Button
              className="bg-[#d93838] hover:bg-[#d93838]/90"
              disabled={confirmText !== 'DELETE' || clearing}
              onClick={handleClearAll}
            >
              {clearing ? 'Clearing…' : 'Clear everything'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
