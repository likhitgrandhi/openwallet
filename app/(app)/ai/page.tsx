'use client';

import { useState, useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { SparklesIcon, MailSend01Icon, CheckmarkCircle01Icon, Cancel01Icon, Add01Icon, ArrowUpRight01Icon, ArrowDownLeft01Icon, Alert01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTransactionStore, CATEGORIES } from '@/lib/store/useTransactionStore';
import { formatCurrency } from '@/lib/data/seed';
import type { ParsedTransaction, SkippedItem } from '@/app/api/ai/chat/route';
import { cn } from '@/lib/utils';

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  transactions?: ParsedTransaction[];
  skipped?: SkippedItem[];
  // track which transactions the user toggled
  selected?: Set<number>;
  committed?: boolean;
  addedCount?: number;
  skippedCount?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Income': '#16A34A',
  'Housing': '#0891B2',
  'Food & Dining': '#D97706',
  'Auto & Transport': '#7C3AED',
  'Shopping': '#DB2777',
  'Health & Wellness': '#16A34A',
  'Entertainment': '#4F46E5',
  'Travel & Vacation': '#0891B2',
  'Subscriptions': '#9333EA',
  'Education': '#2563EB',
  'Investments': '#059669',
  'Savings': '#10B981',
  'Transfers': '#6B7280',
  'Other': '#9CA3AF',
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function TransactionCard({
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
  const color = CATEGORY_COLORS[tx.category] || '#9CA3AF';
  const isDebit = tx.type === 'debit';

  return (
    <button
      type="button"
      onClick={() => !committed && onToggle(index)}
      className={cn(
        'w-full text-left rounded-xl border transition-all duration-150 p-3',
        committed
          ? selected
            ? 'border-[#10B981]/30 bg-[#f0fdf9] cursor-default opacity-80'
            : 'border-[#e8e8e6] bg-white cursor-default opacity-40'
          : selected
          ? 'border-[#0A0A0A]/20 bg-[#F7F7F7] cursor-pointer'
          : 'border-[#e8e8e6] bg-white hover:border-[#d0d0cc] cursor-pointer'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Check indicator */}
        <div
          className={cn(
            'mt-0.5 size-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
            selected ? 'border-[#0A0A0A] bg-[#0A0A0A]' : 'border-[#C4C4C4]'
          )}
        >
          {selected && <HugeiconsIcon icon={CheckmarkCircle01Icon} size={10} strokeWidth={2.5} color="white" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-medium text-sm text-[#1a1a1a] truncate">{tx.merchant}</span>
            <span className={cn('font-semibold text-sm tabular-nums flex-shrink-0', isDebit ? 'text-[#d93838]' : 'text-[#1A8A4E]')}>
              {isDebit ? '-' : '+'}
              {formatCurrency(tx.amount)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Category pill */}
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: color + '18', color }}
            >
              {tx.category}
            </span>
            {/* Date */}
            <span className="text-[10px] text-[#ababab]">{formatDate(tx.date)}</span>
            {/* Type */}
            <span className={cn('inline-flex items-center gap-0.5 text-[10px]', isDebit ? 'text-[#d93838]' : 'text-[#1A8A4E]')}>
              {isDebit ? <HugeiconsIcon icon={ArrowUpRight01Icon} size={10} strokeWidth={1.5} /> : <HugeiconsIcon icon={ArrowDownLeft01Icon} size={10} strokeWidth={1.5} />}
              {isDebit ? 'Expense' : 'Income'}
            </span>
            {/* Confidence (only show low/medium) */}
            {tx.confidence !== 'high' && (
              <span className={cn('text-[10px]', tx.confidence === 'low' ? 'text-[#D97706]' : 'text-[#ababab]')}>
                · {CONFIDENCE_LABEL[tx.confidence]} confidence
              </span>
            )}
          </div>

          {/* Tags */}
          {tx.tags.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {tx.tags.map((tag) => (
                <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-[#f5f5f5] text-[#9E9E9E] font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {tx.notes && <p className="text-[10px] text-[#9E9E9E] mt-1">{tx.notes}</p>}
        </div>
      </div>
    </button>
  );
}

function AssistantMessage({
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

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(msg.transactions!.map((_, i) => i)));
  const deselectAll = () => setSelected(new Set());

  if (msg.committed) {
    return (
      <div className="flex items-start gap-2.5">
        <div className="size-7 rounded-full bg-[#0A0A0A] flex items-center justify-center flex-shrink-0 mt-0.5">
          <HugeiconsIcon icon={SparklesIcon} size={14} strokeWidth={1.5} color="white" />
        </div>
        <div className="flex-1">
          <div className="inline-flex items-center gap-1.5 bg-[#f0fdf9] border border-[#10B981]/20 text-[#059669] text-sm px-3 py-2 rounded-xl">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} strokeWidth={2.5} />
            {msg.addedCount! > 0 && (
              <span>
                Added <strong>{msg.addedCount}</strong> transaction{msg.addedCount !== 1 ? 's' : ''}
              </span>
            )}
            {msg.addedCount! > 0 && msg.skippedCount! > 0 && <span>·</span>}
            {msg.skippedCount! > 0 && (
              <span className="text-[#9E9E9E]">
                {msg.skippedCount} skipped
              </span>
            )}
            {msg.addedCount === 0 && msg.skippedCount === 0 && <span>Nothing to add</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="size-7 rounded-full bg-[#0A0A0A] flex items-center justify-center flex-shrink-0 mt-0.5">
        <HugeiconsIcon icon={SparklesIcon} size={14} strokeWidth={1.5} color="white" />
      </div>

      <div className="flex-1 space-y-3">
        {/* Intro text */}
        {hasTxns && (
          <p className="text-sm text-[#474747]">
            Found <strong className="text-[#1a1a1a]">{msg.transactions!.length}</strong> transaction
            {msg.transactions!.length !== 1 ? 's' : ''}. Select the ones you want to add:
          </p>
        )}
        {!hasTxns && !hasSkipped && (
          <p className="text-sm text-[#474747]">I couldn&apos;t find any transactions in that message.</p>
        )}

        {/* Transaction cards */}
        {hasTxns && (
          <div className="space-y-2">
            {msg.transactions!.map((tx, i) => (
              <TransactionCard
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

        {/* Skipped items */}
        {hasSkipped && (
          <div className="rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[#D97706]">
              <HugeiconsIcon icon={Alert01Icon} size={14} strokeWidth={1.5} />
              <span className="text-xs font-semibold">Could not parse</span>
            </div>
            {msg.skipped!.map((s, i) => (
              <div key={i} className="text-xs text-[#92400e]">
                <span className="font-medium">&ldquo;{s.text}&rdquo;</span>
                <span className="text-[#b45309] ml-1">— {s.reason}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action bar */}
        {hasTxns && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-[#0A0A0A] hover:bg-[#2C2C2C] text-white text-[12px] h-8 px-3 gap-1.5 rounded-[8px]"
              onClick={() => onCommit(msg.id, selected)}
              disabled={selected.size === 0}
            >
              <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.5} />
              Add {selected.size > 0 ? selected.size : ''} transaction{selected.size !== 1 ? 's' : ''}
            </Button>
            <button
              type="button"
              onClick={selected.size === msg.transactions!.length ? deselectAll : selectAll}
              className="text-xs text-[#9E9E9E] hover:text-[#474747] transition-colors"
            >
              {selected.size === msg.transactions!.length ? 'Deselect all' : 'Select all'}
            </button>
            {selected.size < msg.transactions!.length && (
              <span className="text-xs text-[#c0c0c0]">
                {msg.transactions!.length - selected.size} will be skipped
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  'Spent 450 on Zomato for dinner today',
  'Paid 22000 rent yesterday, 1200 for society maintenance',
  'Transferred 10000 to my savings account today',
  'Received salary of 85000, bought groceries for 3200 on BigBasket',
];

export default function AIPage() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addTransaction } = useTransactionStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
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
  };

  const handleCommit = (msgId: string, selected: Set<number>) => {
    const target = messages.find((m) => m.id === msgId && m.role === 'assistant');
    if (!target || !target.transactions) return;

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
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="min-h-screen py-[40px]">
      <div className="max-w-[1180px] mx-auto px-6 pl-[72px] flex flex-col min-h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex-shrink-0 mb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A] mb-2">AI Assistant</p>
        <h1
          className="font-bold text-[28px] leading-[1.2] text-[#0A0A0A]"
          style={{ letterSpacing: '-0.03em' }}
        >
          Add transactions by talking
        </h1>
        <p className="text-[14px] text-[#525252] leading-[1.5] mt-2">
          Describe your transactions in plain language — or use Wispr Flow to speak them. Kimi K2.5 will categorise and tag them automatically.
        </p>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto pb-4">
        {isEmpty ? (
          /* Empty state with suggestions */
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A] mb-3">Try saying</p>
            <div className="grid grid-cols-1 gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setInput(s);
                    textareaRef.current?.focus();
                  }}
                  className="text-left text-[14px] text-[#525252] bg-white border border-[#E4E4E4] rounded-[8px] px-4 py-2.5 hover:bg-[#F7F7F7] hover:border-[#C4C4C4] transition-colors"
                >
                  &ldquo;{s}&rdquo;
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl space-y-6 pb-2">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="bg-[#0A0A0A] text-white text-[14px] px-4 py-2.5 rounded-[8px] rounded-tr-sm max-w-[80%]">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <AssistantMessage msg={msg} onCommit={handleCommit} />
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2.5">
                <div className="size-7 rounded-full bg-[#01291e] flex items-center justify-center flex-shrink-0">
                  <HugeiconsIcon icon={SparklesIcon} size={14} strokeWidth={1.5} color="white" />
                </div>
                <div className="flex gap-1 items-center">
                  <span className="size-1.5 rounded-full bg-[#c0c0c0] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="size-1.5 rounded-full bg-[#c0c0c0] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="size-1.5 rounded-full bg-[#c0c0c0] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-2 flex items-center gap-2 bg-[#FFF5F5] border border-[#E53E3E]/20 rounded-[8px] px-4 py-2.5 max-w-2xl">
          <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.5} className="text-[#E53E3E] flex-shrink-0" />
          <p className="text-sm text-[#d93838]">{error}</p>
          <button type="button" onClick={() => setError(null)} className="ml-auto text-[#d93838]/60 hover:text-[#d93838]">
            <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="pb-8 flex-shrink-0">
        <div className="max-w-2xl">
          <div className="flex gap-2 items-end bg-white border border-[#E4E4E4] rounded-[8px] p-2 focus-within:border-[#0A0A0A] transition-all">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your transactions… e.g. 'Spent ₹450 on Zomato, paid ₹1200 at petrol pump'"
              className="flex-1 resize-none border-0 shadow-none focus-visible:ring-0 text-sm text-[#1a1a1a] placeholder:text-[#c0c0c0] min-h-[44px] max-h-[120px] p-1.5 bg-transparent"
              rows={1}
              disabled={loading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              size="icon"
              className="size-9 rounded-[8px] bg-[#0A0A0A] hover:bg-[#2C2C2C] text-white flex-shrink-0"
            >
              <HugeiconsIcon icon={MailSend01Icon} size={16} strokeWidth={1.5} />
            </Button>
          </div>
          <p className="text-[11px] text-[#8A8A8A] mt-2 text-center">
            Press <kbd className="bg-[#F7F7F7] border border-[#E4E4E4] rounded px-1 text-[10px]">↵ Enter</kbd> to send · <kbd className="bg-[#F7F7F7] border border-[#E4E4E4] rounded px-1 text-[10px]">⇧ Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
