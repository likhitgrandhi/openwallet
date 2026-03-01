'use client';

import { useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, ArrowReloadHorizontalIcon, CheckmarkCircle01Icon, Alert01Icon, Loading03Icon } from '@hugeicons/core-free-icons';
import { useSyncStore } from '@/lib/store/useSyncStore';

function StatusLine({ scanned, total, parsed }: { scanned: number; total: number; parsed: number }) {
  if (total === 0) return <span>Counting matching emails…</span>;
  if (scanned === 0) return <span>Starting scan of {total.toLocaleString()} emails…</span>;
  if (scanned < total) {
    return (
      <span>
        Email {scanned.toLocaleString()} of {total.toLocaleString()}
        {parsed > 0 && <> · <strong className="text-gray-600">{parsed} transactions</strong> found</>}
      </span>
    );
  }
  return <span>Saving {parsed} transactions…</span>;
}

export function SyncDrawer() {
  const { syncStatus, progress, errorMessage, resetSync, cancelSync } = useSyncStore();

  // Auto-dismiss 6 s after success
  useEffect(() => {
    if (syncStatus !== 'complete') return;
    const t = setTimeout(resetSync, 6000);
    return () => clearTimeout(t);
  }, [syncStatus, resetSync]);

  if (syncStatus === 'idle') return null;

  const isBusy = syncStatus === 'fetching' || syncStatus === 'running';
  const pct =
    progress.total > 0
      ? Math.min(100, Math.round((progress.scanned / progress.total) * 100))
      : 0;

  // Animate the progress bar with an indeterminate shimmer when fetching
  const progressBarStyle =
    syncStatus === 'fetching'
      ? { width: '30%', opacity: 0.6 }
      : { width: `${pct}%` };

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[440px] max-w-[calc(100vw-2rem)]
                 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden"
    >
      {/* Progress track */}
      <div className="h-[3px] bg-[#f3f4f6]">
        {isBusy && (
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={progressBarStyle}
          />
        )}
        {syncStatus === 'complete' && <div className="h-full bg-green-500" />}
        {syncStatus === 'error' && <div className="h-full bg-red-500" />}
      </div>

      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Icon */}
        <div className="shrink-0">
          {syncStatus === 'fetching' && <HugeiconsIcon icon={Loading03Icon} size={16} strokeWidth={1.5} color="#60a5fa" className="animate-spin" />}
          {syncStatus === 'running' && <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={16} strokeWidth={1.5} color="#3b82f6" className="animate-spin" />}
          {syncStatus === 'complete' && <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} strokeWidth={1.5} color="#22c55e" />}
          {syncStatus === 'error' && <HugeiconsIcon icon={Alert01Icon} size={16} strokeWidth={1.5} color="#ef4444" />}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          {syncStatus === 'fetching' && (
            <>
              <p className="text-sm font-medium text-gray-900">Connecting to Gmail…</p>
              <p className="text-xs text-gray-400 mt-0.5">Searching for bank transaction emails</p>
            </>
          )}
          {syncStatus === 'running' && (
            <>
              <p className="text-sm font-medium text-gray-900">Scanning Gmail</p>
              <p className="text-xs text-gray-400 mt-0.5">
                <StatusLine {...progress} />
              </p>
            </>
          )}
          {syncStatus === 'complete' && (
            <>
              <p className="text-sm font-medium text-gray-900">Sync complete</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {progress.parsed > 0
                  ? `${progress.parsed} transactions imported from ${progress.scanned.toLocaleString()} emails`
                  : `Scanned ${progress.scanned.toLocaleString()} emails — no new transactions found`}
              </p>
            </>
          )}
          {syncStatus === 'error' && (
            <>
              <p className="text-sm font-medium text-gray-900">Sync failed</p>
              <p className="text-xs text-red-400 mt-0.5 truncate">{errorMessage}</p>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isBusy && (
            <button
              onClick={cancelSync}
              className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={resetSync}
            className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-gray-100 transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.5} className="text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
