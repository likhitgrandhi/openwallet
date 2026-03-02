'use client';

import { useState, useCallback, useRef } from 'react';
import ReactGridLayout, { type Layout } from 'react-grid-layout';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Cancel01Icon, HandGripIcon, CursorMove01Icon, Settings01Icon } from '@hugeicons/core-free-icons';
import { AddTransactionForm } from '@/components/transactions/AddTransactionForm';

import { MetricsCard } from './MetricsCard';
import { DailySpendingCard } from './DailySpendingCard';
import { TransactionsCard } from './TransactionsCard';
import { BudgetCard } from './BudgetCard';
import { SubscriptionsCard } from './SubscriptionsCard';
import { GoalsCard } from './GoalsCard';
import { CashflowCard } from './CashflowCard';
import { SummaryCard } from './SummaryCard';

// ─── Widget registry ──────────────────────────────────────────────────────────

interface WidgetDef {
  id: string;
  label: string;
  emoji: string;
  defaultW: number;
  defaultH: number;
  minW: number;
  minH: number;
}

const WIDGET_DEFS: WidgetDef[] = [
  { id: 'metrics',       label: 'Metrics Overview',  emoji: '📊', defaultW: 12, defaultH: 2, minW: 6,  minH: 2 },
  { id: 'daily',         label: 'Daily Spending',     emoji: '📅', defaultW: 4,  defaultH: 7, minW: 3,  minH: 5 },
  { id: 'transactions',  label: 'Transactions',       emoji: '💳', defaultW: 8,  defaultH: 7, minW: 4,  minH: 5 },
  { id: 'budget',        label: 'Budget',             emoji: '🎯', defaultW: 4,  defaultH: 7, minW: 3,  minH: 5 },
  { id: 'subscriptions', label: 'Subscriptions',      emoji: '🔁', defaultW: 4,  defaultH: 6, minW: 3,  minH: 4 },
  { id: 'goals',         label: 'Goals',              emoji: '🏆', defaultW: 4,  defaultH: 6, minW: 3,  minH: 4 },
  { id: 'cashflow',      label: 'Cash Flow',          emoji: '🌊', defaultW: 12, defaultH: 7, minW: 6,  minH: 5 },
  { id: 'summary',       label: 'Summary',            emoji: '📋', defaultW: 4,  defaultH: 8, minW: 3,  minH: 6 },
];

const DEFAULT_ACTIVE = ['metrics', 'daily', 'transactions', 'budget', 'subscriptions', 'goals'];

const DEFAULT_LAYOUT: Layout[] = [
  { i: 'metrics',       x: 0, y: 0,  w: 12, h: 2,  minW: 6,  minH: 2  },
  { i: 'daily',         x: 0, y: 2,  w: 4,  h: 7,  minW: 3,  minH: 5  },
  { i: 'transactions',  x: 4, y: 2,  w: 8,  h: 7,  minW: 4,  minH: 5  },
  { i: 'budget',        x: 0, y: 9,  w: 4,  h: 7,  minW: 3,  minH: 5  },
  { i: 'subscriptions', x: 4, y: 9,  w: 4,  h: 6,  minW: 3,  minH: 4  },
  { i: 'goals',         x: 8, y: 9,  w: 4,  h: 6,  minW: 3,  minH: 4  },
];

// ─── Custom resize handle ─────────────────────────────────────────────────────
// react-grid-layout renders this inside the grid item — must have ref forwarding.
// We destructure `handleAxis` so it is never forwarded to the DOM element.
import React from 'react';

interface ResizeHandleProps extends React.HTMLAttributes<HTMLDivElement> {
  handleAxis?: string;
}

const ResizeHandleComponent = React.forwardRef<HTMLDivElement, ResizeHandleProps>(
  ({ handleAxis: _handleAxis, ...props }, ref) => (
    <div
      ref={ref}
      {...props}
      className="react-resizable-handle react-resizable-handle-se"
      style={{
        position: 'absolute',
        bottom: 6,
        right: 6,
        width: 20,
        height: 20,
        cursor: 'se-resize',
        opacity: 0,
        transition: 'opacity 0.15s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 5,
        background: 'rgba(0,0,0,0.07)',
        zIndex: 30,
      }}
    >
      <HugeiconsIcon icon={CursorMove01Icon} size={10} strokeWidth={2} color="#888" />
    </div>
  )
);
ResizeHandleComponent.displayName = 'ResizeHandle';

// ─── Widget renderer ──────────────────────────────────────────────────────────

function WidgetContent({ id, month }: { id: string; month: string }) {
  switch (id) {
    case 'metrics':       return <MetricsCard month={month} />;
    case 'daily':         return <DailySpendingCard month={month} />;
    case 'transactions':  return <TransactionsCard month={month} />;
    case 'budget':        return <BudgetCard month={month} />;
    case 'subscriptions': return <SubscriptionsCard />;
    case 'goals':         return <GoalsCard month={month} />;
    case 'cashflow':      return <CashflowCard month={month} />;
    case 'summary':       return <SummaryCard />;
    default:              return null;
  }
}

// ─── Add Widget Panel ─────────────────────────────────────────────────────────

function AddWidgetPanel({
  activeIds,
  onAdd,
  onRemove,
  onClose,
  excludeWidgets = [],
}: {
  activeIds: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
  excludeWidgets?: string[];
}) {
  const defs = WIDGET_DEFS.filter((d) => !excludeWidgets.includes(d.id));
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pointer-events-none">
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] pointer-events-auto" onClick={onClose} />
      <div className="relative pointer-events-auto w-[280px] bg-white border border-[#ebebeb] rounded-2xl shadow-2xl mt-24 mr-8 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0]">
          <div>
            <p className="text-sm font-semibold text-[#01291e]">Widgets</p>
            <p className="text-[11px] text-[#c0c0c0] mt-0.5">Click to show or hide</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#f5f5f5] hover:bg-[#ebebeb] transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={2} color="#474747" />
          </button>
        </div>
        <div className="p-3 flex flex-col gap-1.5">
          {defs.map((def) => {
            const isActive = activeIds.includes(def.id);
            return (
              <button
                key={def.id}
                onClick={() => isActive ? onRemove(def.id) : onAdd(def.id)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border transition-all text-left"
                style={{
                  borderColor: isActive ? '#01291e' : '#ebebeb',
                  background: isActive ? '#f0f7f4' : '#fafaf8',
                }}
              >
                <span className="text-base w-6 text-center">{def.emoji}</span>
                <span className="text-[13px] font-medium text-[#333] flex-1">{def.label}</span>
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{
                    borderColor: isActive ? '#01291e' : '#ddd',
                    background: isActive ? '#01291e' : 'transparent',
                  }}
                >
                  {isActive && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5L3.2 5.8L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main WidgetGrid ──────────────────────────────────────────────────────────

const COL_COUNT = 12;
const ROW_HEIGHT = 60;
const MARGIN: [number, number] = [16, 16];

interface WidgetGridProps {
  month: string;
  containerWidth: number;
  excludeWidgets?: string[];
  /** When provided, the internal toolbar (Add Transaction / Add Widget / Settings) is hidden.
   *  The parent is responsible for triggering these actions via the callbacks below. */
  hideToolbar?: boolean;
  externalShowPanel?: boolean;
  onPanelClose?: () => void;
  externalShowAddTransaction?: boolean;
  onAddTransactionClose?: () => void;
}

export function WidgetGrid({
  month,
  containerWidth,
  excludeWidgets = [],
  hideToolbar = false,
  externalShowPanel,
  onPanelClose,
  externalShowAddTransaction,
  onAddTransactionClose,
}: WidgetGridProps) {
  const filteredLayout = (() => {
    const filtered = DEFAULT_LAYOUT.filter((l) => !excludeWidgets.includes(l.i));
    if (filtered.length === 0) return filtered;
    const minY = Math.min(...filtered.map((l) => l.y));
    if (minY > 0) {
      return filtered.map((l) => ({ ...l, y: l.y - minY }));
    }
    return filtered;
  })();
  const filteredActive = DEFAULT_ACTIVE.filter((id) => !excludeWidgets.includes(id));
  const [layout, setLayout] = useState<Layout[]>(filteredLayout);
  const [activeIds, setActiveIds] = useState<string[]>(filteredActive);
  const [internalShowPanel, setInternalShowPanel] = useState(false);
  const [internalShowAddTransaction, setInternalShowAddTransaction] = useState(false);

  // When hideToolbar=true, panel/transaction visibility is driven externally
  const showPanel = hideToolbar ? (externalShowPanel ?? false) : internalShowPanel;
  const showAddTransaction = hideToolbar ? (externalShowAddTransaction ?? false) : internalShowAddTransaction;

  // ── Haptic feedback on resize snap ──────────────────────────────────────────
  // We track the last snapped (w, h) of the item being resized. Each time those
  // integers change the widget has crossed a grid line — fire a short vibration.
  const resizeSnapRef = useRef<{ w: number; h: number } | null>(null);

  const handleResizeStart = useCallback(
    (_layout: Layout[], _oldItem: Layout, newItem: Layout) => {
      resizeSnapRef.current = { w: newItem.w, h: newItem.h };
    },
    []
  );

  const handleResize = useCallback(
    (_layout: Layout[], _oldItem: Layout, newItem: Layout) => {
      const prev = resizeSnapRef.current;
      if (prev && (prev.w !== newItem.w || prev.h !== newItem.h)) {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(8);
        }
        resizeSnapRef.current = { w: newItem.w, h: newItem.h };
      }
    },
    []
  );

  const addWidget = useCallback((id: string) => {
    const def = WIDGET_DEFS.find((d) => d.id === id);
    if (!def || activeIds.includes(id) || excludeWidgets.includes(id)) return;
    const maxY = layout.reduce((m, l) => Math.max(m, l.y + l.h), 0);
    const newItem: Layout = {
      i: id, x: 0, y: maxY,
      w: def.defaultW, h: def.defaultH,
      minW: def.minW, minH: def.minH,
    };
    setLayout((prev) => [...prev, newItem]);
    setActiveIds((prev) => [...prev, id]);
  }, [activeIds, layout, excludeWidgets]);

  const removeWidget = useCallback((id: string) => {
    if (id === 'metrics') return;
    setLayout((prev) => prev.filter((l) => l.i !== id));
    setActiveIds((prev) => prev.filter((a) => a !== id));
  }, []);

  // Keep layout item constraints in sync; only render active widgets
  const enrichedLayout: Layout[] = layout
    .filter((l) => activeIds.includes(l.i))
    .map((l) => {
      const def = WIDGET_DEFS.find((d) => d.id === l.i);
      return {
        ...l,
        minW: def?.minW ?? 2,
        minH: def?.minH ?? 2,
        // maxW is left unset (unlimited) — users can fill the row freely
      };
    });

  return (
    <div className="relative">
      {/* Toolbar — hidden when controlled externally (hideToolbar=true) */}
      {!hideToolbar && (
        <div className="flex items-center justify-end gap-2 mb-4">
          <p className="text-[11px] text-[#c0c0c0] mr-auto">
            Drag cards to rearrange · Resize from corner
          </p>

          {/* Add Transaction */}
          <button
            onClick={() => setInternalShowAddTransaction(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium border bg-[#0A0A0A] text-white transition-all shadow-sm hover:bg-[#2C2C2C]"
            style={{ borderColor: '#0A0A0A' }}
          >
            <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} color="white" />
            Add transaction
          </button>

          {/* Add widget */}
          <button
            onClick={() => setInternalShowPanel((v) => !v)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium border bg-white transition-all shadow-sm"
            style={{
              borderColor: showPanel ? '#0A0A0A' : '#ebebeb',
              color: showPanel ? '#0A0A0A' : '#474747',
            }}
          >
            <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} />
            Add widget
          </button>

          {/* Categories settings */}
          <button
            onClick={() => window.location.href = '/settings'}
            className="flex items-center justify-center w-9 h-9 rounded-xl border bg-white transition-all shadow-sm hover:bg-[#f5f5f5]"
            style={{ borderColor: '#ebebeb' }}
            title="Manage categories"
          >
            <HugeiconsIcon icon={Settings01Icon} size={16} strokeWidth={1.5} color="#525252" />
          </button>
        </div>
      )}

      {/* Grid */}
      <ReactGridLayout
        layout={enrichedLayout}
        cols={COL_COUNT}
        rowHeight={ROW_HEIGHT}
        width={containerWidth}
        margin={MARGIN}
        containerPadding={[0, 0]}
        compactType="vertical"
        preventCollision={false}
        onLayoutChange={(newLayout) => setLayout(newLayout)}
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        draggableHandle=".widget-drag-handle"
        resizeHandles={['se']}
        resizeHandle={<ResizeHandleComponent />}
        useCSSTransforms
        isBounded={false}
        autoSize
        className="relative"
      >
        {activeIds.map((id) => (
          // react-grid-layout requires a direct div child with the matching key
          <div key={id} className="group/widget relative w-full h-full">
            {/* Drag + remove overlay — sits above the card */}
            <div className="absolute inset-0 z-10 pointer-events-none rounded-2xl overflow-hidden">
              <div
                className="widget-drag-handle absolute top-0 left-0 right-0 h-8
                            flex items-center justify-center
                            opacity-0 group-hover/widget:opacity-100 transition-opacity
                            cursor-grab active:cursor-grabbing pointer-events-auto select-none"
                style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.045) 0%, transparent 100%)' }}
              >
                <HugeiconsIcon icon={HandGripIcon} size={13} strokeWidth={1.5} className="text-[#b0b0b0]" />
              </div>
            </div>

            {/* Remove button — outside overflow-hidden so it isn't clipped */}
            {id !== 'metrics' && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => removeWidget(id)}
                className="absolute top-2.5 right-2.5 z-20
                           flex items-center justify-center w-[18px] h-[18px] rounded-full
                           bg-white border border-[#ebebeb] shadow-sm
                           opacity-0 group-hover/widget:opacity-100 transition-opacity
                           hover:bg-red-50 hover:border-red-200"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={9} strokeWidth={2.5} className="text-[#aaa]" />
              </button>
            )}

            {/* Widget card fills the grid cell.
                flex flex-col here makes flex-1 cards (Transactions, Subscriptions, Goals)
                correctly fill the cell height instead of growing to content size. */}
            <div className="w-full h-full flex flex-col">
              <WidgetContent id={id} month={month} />
            </div>
          </div>
        ))}
      </ReactGridLayout>

      {/* Panel */}
      {showPanel && (
        <AddWidgetPanel
          activeIds={activeIds}
          onAdd={addWidget}
          onRemove={removeWidget}
          onClose={() => { setInternalShowPanel(false); onPanelClose?.(); }}
          excludeWidgets={excludeWidgets}
        />
      )}

      {/* Add Transaction form */}
      <AddTransactionForm
        open={showAddTransaction}
        onClose={() => { setInternalShowAddTransaction(false); onAddTransactionClose?.(); }}
        defaultMonth={month}
      />
    </div>
  );
}
