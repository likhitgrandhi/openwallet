'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  SparklesIcon,
  CheckmarkCircle01Icon,
  Alert01Icon,
  Add01Icon,
  ArrowUpRight01Icon,
  ArrowDownLeft01Icon,
} from '@hugeicons/core-free-icons';
import { useTransactionStore, CATEGORIES } from '@/lib/store/useTransactionStore';
import { formatCurrency } from '@/lib/data/seed';
import type { ParsedTransaction, SkippedItem } from '@/app/api/ai/chat/route';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  transactions?: ParsedTransaction[];
  skipped?: SkippedItem[];
  committed?: boolean;
  addedCount?: number;
  skippedCount?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  'Income': '#4ade80',
  'Housing': '#38bdf8',
  'Food & Dining': '#fbbf24',
  'Auto & Transport': '#a78bfa',
  'Shopping': '#f472b6',
  'Health & Wellness': '#4ade80',
  'Entertainment': '#818cf8',
  'Travel & Vacation': '#38bdf8',
  'Subscriptions': '#c084fc',
  'Education': '#60a5fa',
  'Investments': '#34d399',
  'Savings': '#34d399',
  'Transfers': '#94a3b8',
  'Other': '#94a3b8',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── Compact Transaction Card (dark/overlay style) ────────────────────────────

function OverlayTransactionCard({
  tx,
  index,
  selected,
  committed,
  onToggle,
}: {
  tx: ParsedTransaction;
  index: number;
  selected: boolean;
  committed: boolean;
  onToggle: (i: number) => void;
}) {
  const color = CATEGORY_COLORS[tx.category] || '#94a3b8';
  const isDebit = tx.type === 'debit';

  return (
    <button
      type="button"
      onClick={() => !committed && onToggle(index)}
      className={cn(
        'w-full text-left rounded-[10px] border transition-all duration-150 px-3 py-2.5',
        committed
          ? selected
            ? 'border-[#E4E4E4] bg-white/60 cursor-default opacity-60'
            : 'border-[#E4E4E4] bg-white/30 cursor-default opacity-30'
          : selected
          ? 'border-[#C4C4C4] bg-white/80 cursor-pointer'
          : 'border-[#E4E4E4] bg-white/50 hover:bg-white/70 cursor-pointer'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              'size-3.5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all',
              selected ? 'border-[#0A0A0A] bg-[#0A0A0A]' : 'border-[#C4C4C4] bg-transparent'
            )}
          >
            {selected && (
              <svg width="6" height="5" viewBox="0 0 6 5" fill="none">
                <path d="M1 2.5L2.5 4L5 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className="text-[13px] font-medium text-[#0A0A0A] truncate">{tx.merchant}</span>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color + '25', color: color }}
          >
            {tx.category}
          </span>
          <span className="text-[10px] text-[#8A8A8A] flex-shrink-0">{formatDate(tx.date)}</span>
        </div>
        <span className={cn('text-[13px] font-semibold tabular-nums flex-shrink-0', isDebit ? 'text-[#E53E3E]' : 'text-[#0BAF6B]')}>
          <span className="flex items-center gap-0.5">
            {isDebit
              ? <HugeiconsIcon icon={ArrowUpRight01Icon} size={10} strokeWidth={1.5} />
              : <HugeiconsIcon icon={ArrowDownLeft01Icon} size={10} strokeWidth={1.5} />}
            {isDebit ? '-' : '+'}{formatCurrency(tx.amount)}
          </span>
        </span>
      </div>
    </button>
  );
}

// ─── Overlay AI Response ──────────────────────────────────────────────────────

function OverlayAssistantMessage({
  msg,
  onCommit,
}: {
  msg: AIMessage;
  onCommit: (msgId: string, selected: Set<number>) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(msg.transactions?.map((_, i) => i) ?? [])
  );

  const hasTxns = (msg.transactions?.length ?? 0) > 0;
  const hasSkipped = (msg.skipped?.length ?? 0) > 0;

  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const allSelected = hasTxns && selected.size === msg.transactions!.length;

  if (msg.committed) {
    return (
      <div className="flex items-start gap-2.5">
        <div className="size-6 rounded-full bg-[#0A0A0A]/8 border border-[#E4E4E4] flex items-center justify-center flex-shrink-0 mt-0.5">
          <HugeiconsIcon icon={SparklesIcon} size={12} strokeWidth={1.5} color="#0A0A0A" />
        </div>
        <div className="inline-flex items-center gap-1.5 bg-[#EDFCF5] border border-[#0BAF6B]/30 text-[#0BAF6B] text-[13px] px-3 py-2 rounded-[10px]">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} strokeWidth={2} />
          {msg.addedCount! > 0 && <span>Added <strong>{msg.addedCount}</strong> transaction{msg.addedCount !== 1 ? 's' : ''}</span>}
          {msg.addedCount! > 0 && msg.skippedCount! > 0 && <span className="opacity-50">·</span>}
          {msg.skippedCount! > 0 && <span className="text-[#8A8A8A]">{msg.skippedCount} skipped</span>}
          {msg.addedCount === 0 && msg.skippedCount === 0 && <span>Nothing to add</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="size-6 rounded-full bg-[#0A0A0A]/8 border border-[#E4E4E4] flex items-center justify-center flex-shrink-0 mt-0.5">
        <HugeiconsIcon icon={SparklesIcon} size={12} strokeWidth={1.5} color="#0A0A0A" />
      </div>
      <div className="flex-1 space-y-2 min-w-0">
        {hasTxns && (
          <p className="text-[13px] text-[#525252]">
            Found <strong className="text-[#0A0A0A]">{msg.transactions!.length}</strong> transaction{msg.transactions!.length !== 1 ? 's' : ''} — select to add:
          </p>
        )}
        {!hasTxns && !hasSkipped && (
          <p className="text-[13px] text-[#525252]">Couldn&apos;t find any transactions in that message.</p>
        )}

        {hasTxns && (
          <div className="space-y-1">
            {msg.transactions!.map((tx, i) => (
              <OverlayTransactionCard
                key={i}
                tx={tx}
                index={i}
                selected={selected.has(i)}
                committed={false}
                onToggle={toggle}
              />
            ))}
          </div>
        )}

        {hasSkipped && (
          <div className="rounded-[10px] border border-amber-300/40 bg-amber-50 px-3 py-2 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-700">
              <HugeiconsIcon icon={Alert01Icon} size={12} strokeWidth={1.5} />
              <span className="text-[11px] font-semibold">Could not parse</span>
            </div>
            {msg.skipped!.map((s, i) => (
              <p key={i} className="text-[11px] text-amber-600/80">
                &ldquo;{s.text}&rdquo; — {s.reason}
              </p>
            ))}
          </div>
        )}

        {hasTxns && (
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => onCommit(msg.id, selected)}
              disabled={selected.size === 0}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium bg-[#0A0A0A] text-white rounded-[8px] px-3 py-1.5 hover:bg-[#2C2C2C] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2} />
              Add {selected.size > 0 ? selected.size : ''} transaction{selected.size !== 1 ? 's' : ''}
            </button>
            <button
              type="button"
              onClick={() => allSelected ? setSelected(new Set()) : setSelected(new Set(msg.transactions!.map((_, i) => i)))}
              className="text-[11px] text-[#8A8A8A] hover:text-[#525252] transition-colors"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Overlay ─────────────────────────────────────────────────────────────

export function AICommandOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const { addTransaction } = useTransactionStore();

  // ── Open on Cmd+K / Ctrl+K ──────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── ESC to close ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  // ── Focus input when opened ─────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      // slight delay to let the overlay render
      const t = setTimeout(() => {
        inputRef.current?.focus();
        // place cursor at end
        const len = inputRef.current?.value.length ?? 0;
        inputRef.current?.setSelectionRange(len, len);
      }, 60);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ── Auto-scroll to latest message ──────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Send message ────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setError(null);

    const userMsg: AIMessage = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, categories: CATEGORIES }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        setLoading(false);
        return;
      }

      const aiMsg: AIMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        transactions: data.transactions ?? [],
        skipped: data.skipped ?? [],
        committed: false,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  // ── Commit transactions ─────────────────────────────────────────────────────
  const handleCommit = (msgId: string, selected: Set<number>) => {
    const target = messages.find((m) => m.id === msgId && m.role === 'assistant');
    if (!target?.transactions) return;

    let addedCount = 0;
    target.transactions.forEach((tx, i) => {
      if (!selected.has(i)) return;
      addTransaction(
        {
          merchant: tx.merchant,
          merchantRaw: tx.merchant,
          amount: tx.amount,
          type: tx.type,
          category: tx.category,
          date: new Date(tx.date + 'T00:00:00'),
          account: 'Manual',
          bank: 'Manual',
          notes: tx.notes ?? '',
          tags: tx.tags,
          emailId: '',
          rawText: '',
          isRecurring: false,
        },
        true
      );
      addedCount++;
    });

    const skippedCount = target.transactions.length - addedCount;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.role === 'assistant'
          ? { ...m, committed: true, addedCount, skippedCount, selected: new Set(selected) }
          : m
      )
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const hasMessages = messages.length > 0;

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex flex-col ai-overlay-enter"
      onClick={(e) => {
        if (e.target === overlayRef.current) setIsOpen(false);
      }}
    >
      {/* Snowy frosted-glass backdrop — no color tint, just blur */}
      <div className="absolute inset-0 backdrop-blur-md bg-white/10" />

      {/* Full-width breathing gradient bloom pinned to the bottom */}
      <div className="absolute inset-x-0 bottom-0 h-[320px] ai-bottom-band pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">

        {/* Close hint — top right */}
        <div className="flex justify-end px-6 pt-5 pb-0 flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-1.5 text-[#525252] hover:text-[#0A0A0A] transition-colors text-[12px] font-medium"
          >
            <kbd className="bg-[#F0F0F0] border border-[#E4E4E4] rounded-[5px] px-1.5 py-0.5 text-[10px] font-medium text-[#525252] leading-none">ESC</kbd>
            close
          </button>
        </div>

        {/* Messages area — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col justify-end">
          <div className="max-w-2xl w-full mx-auto">
            {hasMessages && (
              <div className="space-y-5 mb-4">
                {messages.map((msg) => (
                  <div key={msg.id}>
                    {msg.role === 'user' ? (
                      <div className="flex justify-end">
                        <div className="bg-white/70 backdrop-blur-sm border border-[#E4E4E4] text-[#0A0A0A] text-[14px] leading-[1.5] px-4 py-2.5 rounded-[12px] rounded-tr-[4px] max-w-[78%]">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <OverlayAssistantMessage msg={msg} onCommit={handleCommit} />
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-2.5">
                    <div className="size-6 rounded-full bg-[#0A0A0A]/8 border border-[#E4E4E4] flex items-center justify-center flex-shrink-0">
                      <HugeiconsIcon icon={SparklesIcon} size={12} strokeWidth={1.5} color="#0A0A0A" />
                    </div>
                    <div className="flex gap-1 items-center h-5">
                      <span className="size-1.5 rounded-full bg-[#525252]/50 ai-dot" />
                      <span className="size-1.5 rounded-full bg-[#525252]/50 ai-dot" />
                      <span className="size-1.5 rounded-full bg-[#525252]/50 ai-dot" />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 bg-[#FFF5F5] border border-[#E53E3E]/25 rounded-[10px] px-3 py-2">
                    <HugeiconsIcon icon={Alert01Icon} size={14} strokeWidth={1.5} color="#E53E3E" />
                    <p className="text-[13px] text-[#E53E3E]">{error}</p>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Empty state hint */}
            {!hasMessages && !loading && (
              <p className="text-[#8A8A8A] text-[13px] text-center mb-4 select-none">
                Describe your transactions — e.g. &ldquo;Spent ₹450 on Zomato today&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* Input bar — transparent glass, sits on top of gradient band */}
        <div className="px-6 pb-14 flex-shrink-0">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm border border-white/40 rounded-[16px] px-4 py-3.5 shadow-[0_2px_16px_rgba(0,0,0,0.08)] focus-within:border-white/60 transition-all duration-200">

              {/* Pulsing star icon */}
              <div className="ai-star-pulse flex-shrink-0">
                <HugeiconsIcon icon={SparklesIcon} size={20} strokeWidth={1.5} color="rgba(255,255,255,0.9)" />
              </div>

              {/* Textarea */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your transactions…"
                rows={1}
                disabled={loading}
                className="flex-1 bg-transparent text-white placeholder:text-white/50 text-[14px] leading-[1.5] outline-none resize-none min-h-[24px] max-h-[120px] overflow-auto disabled:opacity-50"
                style={{ fieldSizing: 'content' } as React.CSSProperties}
              />

              {/* Hints */}
              <div className="flex items-center gap-1.5 flex-shrink-0 select-none">
                <kbd className="bg-white/20 border border-white/30 rounded-[5px] px-1.5 py-0.5 text-[10px] font-medium text-white/70 leading-none">⏎</kbd>
                <span className="text-white/60 text-[12px]">to send</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
