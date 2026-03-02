'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon, ArrowRight01Icon, Calendar01Icon, ArrowReloadHorizontalIcon,
  Logout01Icon, User02Icon, ArrowDown01Icon, CheckmarkCircle01Icon, Clock01Icon,
  Add01Icon, Settings01Icon,
} from '@hugeicons/core-free-icons';
import { useSession, signOut } from 'next-auth/react';
import { WidgetGrid } from '@/components/home/WidgetGrid';
import { MetricsCard } from '@/components/home/MetricsCard';
import { formatMonth } from '@/lib/data/seed';
import { useSyncStore } from '@/lib/store/useSyncStore';
import { BANK_SOURCES, ALL_SOURCE_IDS, sendersForSources } from '@/lib/gmail/sources';

// ─── Date preset helpers ────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

const DATE_PRESETS = [
  { label: 'Last 7 days',   getDate: () => daysAgo(7) },
  { label: 'Last 30 days',  getDate: () => daysAgo(30) },
  { label: 'Last 3 months', getDate: () => daysAgo(90) },
  { label: 'Last 6 months', getDate: () => daysAgo(180) },
  { label: 'Last year',     getDate: () => daysAgo(365) },
  { label: 'All time',      getDate: () => new Date('2020-01-01') },
] as const;

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function formatFromDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function matchesPreset(d: Date): string | null {
  const ds = toDateInputValue(d);
  for (const p of DATE_PRESETS) {
    if (toDateInputValue(p.getDate()) === ds) return p.label;
  }
  return null;
}

// ─── Auto-sync interval options ─────────────────────────────────────────────

const AUTO_SYNC_OPTIONS = [
  { label: 'Off',       ms: 0 },
  { label: '15 min',    ms: 15 * 60 * 1000 },
  { label: '30 min',    ms: 30 * 60 * 1000 },
  { label: '1 hour',    ms: 60 * 60 * 1000 },
  { label: '4 hours',   ms: 4 * 60 * 60 * 1000 },
] as const;

// ─── Page helpers ────────────────────────────────────────────────────────────

function getInitialMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function offsetMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const [month, setMonth] = useState(getInitialMonth);
  const [containerWidth, setContainerWidth] = useState(0);
  const [showWidgetPanel, setShowWidgetPanel] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showAutoSync, setShowAutoSync] = useState(false);

  // Date range state — default to "Last 6 months"
  const [syncFromDate, setSyncFromDate] = useState<Date>(() => daysAgo(180));

  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(ALL_SOURCE_IDS);
  const [autoSyncMs, setAutoSyncMs] = useState(0);  // 0 = off
  const [nextSyncIn, setNextSyncIn] = useState<number | null>(null); // seconds until next auto-sync
  const [mounted, setMounted] = useState(false);

  const containerRef  = useRef<HTMLDivElement>(null);
  const menuRef       = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const sourcesRef    = useRef<HTMLDivElement>(null);
  const autoSyncRef   = useRef<HTMLDivElement>(null);
  const autoTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: session } = useSession();
  const { startSync, syncStatus } = useSyncStore();
  const isSyncing = syncStatus === 'running' || syncStatus === 'fetching';
  const isCurrentMonth = month === getInitialMonth();

  // ── handleSync ─────────────────────────────────────────────────────────────
  const handleSync = useCallback(() => {
    if (!session?.access_token || isSyncing || selectedSourceIds.length === 0) return;
    startSync(session.access_token, {
      fromDate: syncFromDate,
      selectedSenders: sendersForSources(selectedSourceIds),
    });
  }, [session, isSyncing, selectedSourceIds, syncFromDate, startSync]);

  // ── Auto-sync timer ────────────────────────────────────────────────────────
  useEffect(() => {
    // Clear previous timers
    if (autoTimerRef.current)  clearInterval(autoTimerRef.current);
    if (countdownRef.current)  clearInterval(countdownRef.current);
    autoTimerRef.current = null;
    countdownRef.current = null;
    setNextSyncIn(null);

    if (autoSyncMs === 0 || !session?.access_token) return;

    let remaining = autoSyncMs / 1000;
    setNextSyncIn(remaining);

    // Countdown tick every second
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setNextSyncIn(Math.max(0, remaining));
    }, 1000);

    // Actual sync interval
    autoTimerRef.current = setInterval(() => {
      remaining = autoSyncMs / 1000;
      setNextSyncIn(remaining);
      handleSync();
    }, autoSyncMs);

    return () => {
      if (autoTimerRef.current)  clearInterval(autoTimerRef.current);
      if (countdownRef.current)  clearInterval(countdownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSyncMs, session?.access_token]);

  // ── Container resize ───────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    ro.observe(el);
    setContainerWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  // ── Hydration guard ────────────────────────────────────────────────────────
  useEffect(() => setMounted(true), []);

  // ── Close dropdowns on outside click ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current       && !menuRef.current.contains(e.target as Node))       setShowUserMenu(false);
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) setShowDatePicker(false);
      if (sourcesRef.current    && !sourcesRef.current.contains(e.target as Node))    setShowSources(false);
      if (autoSyncRef.current   && !autoSyncRef.current.contains(e.target as Node))   setShowAutoSync(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Source helpers ─────────────────────────────────────────────────────────
  const toggleSource = (id: string) => {
    setSelectedSourceIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };
  const allSelected  = selectedSourceIds.length === ALL_SOURCE_IDS.length;
  const noneSelected = selectedSourceIds.length === 0;
  const sourcesLabel = allSelected
    ? 'All sources'
    : noneSelected
    ? 'No sources'
    : `${selectedSourceIds.length} of ${ALL_SOURCE_IDS.length} sources`;

  // ── Date label for pill ────────────────────────────────────────────────────
  const datePresetLabel = matchesPreset(syncFromDate);
  const dateLabel = datePresetLabel ?? `From ${formatFromDate(syncFromDate)}`;

  // ── Auto-sync label + countdown ────────────────────────────────────────────
  const autoSyncLabel = AUTO_SYNC_OPTIONS.find(o => o.ms === autoSyncMs)?.label ?? 'Off';
  const formatCountdown = (secs: number): string => {
    if (secs >= 3600) return `${Math.ceil(secs / 3600)}h`;
    if (secs >= 60)   return `${Math.ceil(secs / 60)}m`;
    return `${Math.ceil(secs)}s`;
  };

  const userName = session?.user?.name ?? 'Guest';

  return (
    <div className="min-h-screen bg-white">

      {/* ── Top band: scrolls away naturally, cards overlap it via negative margin ── */}
      <div
        className="w-full"
        style={{
          height: 320,
          backgroundColor: '#f7fff4',
          backgroundImage: 'url("/passbook_prime.png")',
          backgroundRepeat: 'repeat',
          backgroundSize: 'auto',
        }}
      >
        {/* Header bar — relative+z-30 so its dropdowns float above the z-10 cards */}
        <div
          className="relative z-30 w-full h-[72px] flex items-center justify-between px-[40px] py-[10px]"
        >
          <p className="text-[24px] font-bold leading-5 tracking-[-0.336px] text-[#664900]">
            Passbook
          </p>

          {/* Sync controls + user avatar */}
          <div className="flex items-center gap-2">

              {/* Sync controls — only when signed in with Google */}
              {mounted && session ? (
                <div className="flex items-center">

                  {/* ── Pill 1: Date picker ── */}
                  <div className="relative" ref={datePickerRef}>
                    <button
                      onClick={() => !isSyncing && (setShowDatePicker(v => !v), setShowSources(false), setShowAutoSync(false))}
                      disabled={isSyncing}
                      className="flex items-center gap-1 pl-3 pr-2 py-1.5 rounded-l-xl text-[13px] font-medium border border-r-0 border-[#e4e4e4] bg-white text-[#525252] hover:bg-[#f7f7f7] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <HugeiconsIcon icon={Calendar01Icon} size={14} strokeWidth={2} className="text-[#8a8a8a]" />
                      <span className="max-w-[120px] truncate">{dateLabel}</span>
                      <HugeiconsIcon icon={ArrowDown01Icon} size={12} strokeWidth={2} className="text-[#8a8a8a] shrink-0" />
                    </button>

                    {showDatePicker && (
                      <div className="absolute left-0 top-10 z-50 w-72 bg-white border border-[#ebebeb] rounded-2xl shadow-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-[#f5f5f5]">
                          <p className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">Sync range</p>
                        </div>
                        <div className="p-2 border-b border-[#f5f5f5]">
                          <div className="grid grid-cols-2 gap-1">
                            {DATE_PRESETS.map(preset => {
                              const active = toDateInputValue(syncFromDate) === toDateInputValue(preset.getDate());
                              return (
                                <button
                                  key={preset.label}
                                  onClick={() => { setSyncFromDate(preset.getDate()); setShowDatePicker(false); }}
                                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-[12px] font-medium transition-colors ${
                                    active ? 'bg-[#0A0A0A] text-white' : 'text-[#333] hover:bg-[#f5f5f5]'
                                  }`}
                                >
                                  {preset.label}
                                  {active && <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} strokeWidth={2.5} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-[11px] font-medium text-[#aaa] mb-2">Custom from date</p>
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={toDateInputValue(syncFromDate)}
                              max={toDateInputValue(new Date())}
                              min="2015-01-01"
                              onChange={e => {
                                const d = new Date(e.target.value);
                                if (!isNaN(d.getTime())) setSyncFromDate(d);
                              }}
                              className="flex-1 px-3 py-1.5 rounded-lg border border-[#ebebeb] text-[13px] text-[#333] bg-white focus:outline-none focus:border-[#0A0A0A] transition-colors"
                            />
                            <button
                              onClick={() => setShowDatePicker(false)}
                              className="px-3 py-1.5 rounded-lg bg-[#0A0A0A] text-white text-[12px] font-medium hover:bg-[#2C2C2C] transition-colors"
                            >
                              Apply
                            </button>
                          </div>
                          <p className="text-[11px] text-[#ccc] mt-1.5">
                            Emails from {formatFromDate(syncFromDate)} onwards will be scanned
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Pill 2: Sources multi-select ── */}
                  <div className="relative" ref={sourcesRef}>
                    <button
                      onClick={() => !isSyncing && (setShowSources(v => !v), setShowDatePicker(false), setShowAutoSync(false))}
                      disabled={isSyncing}
                      className="flex items-center gap-1 pl-3 pr-2 py-1.5 text-[13px] font-medium border border-r-0 border-[#e4e4e4] bg-white text-[#525252] hover:bg-[#f7f7f7] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ borderRadius: 0 }}
                    >
                      <span className={noneSelected ? 'text-red-500' : ''}>{sourcesLabel}</span>
                      <HugeiconsIcon icon={ArrowDown01Icon} size={12} strokeWidth={2} className="text-[#8a8a8a]" />
                    </button>

                    {showSources && (
                      <div className="absolute left-0 top-10 z-50 w-56 bg-white border border-[#ebebeb] rounded-2xl shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#f5f5f5]">
                          <span className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">Sources</span>
                          <button
                            onClick={() => setSelectedSourceIds(allSelected ? [] : [...ALL_SOURCE_IDS])}
                            className="text-[11px] font-medium text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                          >
                            {allSelected ? 'Deselect all' : 'Select all'}
                          </button>
                        </div>
                        <div className="py-1 max-h-72 overflow-y-auto">
                          {BANK_SOURCES.map(source => {
                            const checked = selectedSourceIds.includes(source.id);
                            return (
                              <button
                                key={source.id}
                                onClick={() => toggleSource(source.id)}
                                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] text-[#333] hover:bg-[#f5f5f5] transition-colors"
                              >
                                <div
                                  className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors"
                                  style={{
                                    background: checked ? '#0A0A0A' : 'transparent',
                                    border: checked ? '1.5px solid #0A0A0A' : '1.5px solid #d0d0d0',
                                  }}
                                >
                                  {checked && (
                                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                      <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </div>
                                <span>{source.icon}</span>
                                <span className="flex-1 text-left">{source.label}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="px-3.5 py-2 border-t border-[#f5f5f5]">
                          <p className="text-[11px] text-[#aaa]">
                            {selectedSourceIds.length} of {ALL_SOURCE_IDS.length} selected
                            {noneSelected && <span className="text-red-400 ml-1">— select at least one</span>}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Pill 3: Sync button ── */}
                  <button
                    onClick={handleSync}
                    disabled={isSyncing || noneSelected}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium border border-r-0 border-[#e4e4e4] bg-white text-[#525252] hover:bg-[#f7f7f7] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ borderRadius: 0 }}
                  >
                    <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={14} strokeWidth={2} className={isSyncing ? 'animate-spin' : ''} />
                    {isSyncing ? 'Syncing…' : 'Sync Gmail'}
                  </button>

                  {/* ── Pill 4: Auto-sync timer ── */}
                  <div className="relative" ref={autoSyncRef}>
                    <button
                      onClick={() => !isSyncing && (setShowAutoSync(v => !v), setShowDatePicker(false), setShowSources(false))}
                      disabled={isSyncing}
                      className={`flex items-center gap-1 pl-2.5 pr-2 py-1.5 rounded-r-xl text-[13px] font-medium border border-[#e4e4e4] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        autoSyncMs > 0
                          ? 'bg-[#f0f0f0] text-[#525252] hover:bg-[#ebebeb]'
                          : 'bg-white text-[#525252] hover:bg-[#f7f7f7]'
                      }`}
                    >
                      <HugeiconsIcon icon={Clock01Icon} size={14} strokeWidth={2} />
                      {autoSyncMs > 0 && nextSyncIn !== null ? (
                        <span className="font-semibold">{formatCountdown(nextSyncIn)}</span>
                      ) : (
                        <span>{autoSyncLabel}</span>
                      )}
                      <HugeiconsIcon icon={ArrowDown01Icon} size={12} strokeWidth={2} className="text-[#8a8a8a]" />
                    </button>

                    {showAutoSync && (
                      <div className="absolute right-0 top-10 z-50 w-52 bg-white border border-[#ebebeb] rounded-2xl shadow-xl overflow-hidden">
                        <div className="px-3.5 py-2.5 border-b border-[#f5f5f5]">
                          <p className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">Auto-sync interval</p>
                          <p className="text-[11px] text-[#bbb] mt-0.5">Runs while this tab is open</p>
                        </div>
                        <div className="py-1">
                          {AUTO_SYNC_OPTIONS.map(opt => {
                            const active = autoSyncMs === opt.ms;
                            return (
                              <button
                                key={opt.label}
                                onClick={() => { setAutoSyncMs(opt.ms); setShowAutoSync(false); }}
                                className="flex items-center justify-between w-full px-3.5 py-2 text-[13px] text-[#333] hover:bg-[#f5f5f5] transition-colors"
                              >
                                {opt.label}
                                {active && <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} strokeWidth={2.5} className="text-[#0A0A0A]" />}
                              </button>
                            );
                          })}
                        </div>
                        {autoSyncMs > 0 && (
                          <div className="px-3.5 py-2.5 border-t border-[#f5f5f5]">
                            <p className="text-[11px] text-[#0A0A0A]">
                              Next sync in {nextSyncIn !== null ? formatCountdown(nextSyncIn) : '…'}
                            </p>
                            <p className="text-[10px] text-[#bbb] mt-0.5">Only fetches new emails each run</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                mounted && <span className="text-[12px] text-[#8a8a8a] px-1">Demo mode</span>
              )}

              {/* User avatar + dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  className="w-8 h-8 rounded-full bg-[#f0f0f0] border border-[#e4e4e4] flex items-center justify-center overflow-hidden hover:bg-[#ebebeb] transition-colors"
                >
                  {mounted && session?.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <HugeiconsIcon icon={User02Icon} size={16} strokeWidth={1.5} className="text-[#525252]" />
                  )}
                </button>

                {mounted && showUserMenu && (
                  <div className="absolute right-0 top-10 z-50 w-52 bg-white border border-[#ebebeb] rounded-2xl shadow-xl overflow-hidden">
                    {session && (
                      <div className="px-4 py-3 border-b border-[#f5f5f5]">
                        <p className="text-[13px] font-medium text-[#111] truncate">{session.user?.name}</p>
                        <p className="text-[11px] text-[#aaa] truncate mt-0.5">{session.user?.email}</p>
                      </div>
                    )}
                    <div className="p-1.5">
                      {session ? (
                        <button
                          onClick={() => signOut({ callbackUrl: '/login' })}
                          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[13px] text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <HugeiconsIcon icon={Logout01Icon} size={14} strokeWidth={2} />
                          Sign out
                        </button>
                      ) : (
                        <button
                          onClick={() => window.location.href = '/login'}
                          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[13px] text-[#333] hover:bg-[#f5f5f5] transition-colors"
                        >
                          Sign in with Google
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>

      {/* ── Content: negative margin pulls cards up to overlap the band ── */}
      <div
        className="relative z-10 max-w-[1080px] mx-auto px-6 pl-[72px] flex flex-col gap-4 pb-12"
        style={{ marginTop: -180 }}
      >
        {/* Greeting card — Figma: white card, rounded-[24px], p-[24px], gap-[32px] */}
        <div
          className="bg-white border border-[#e6e6e6] rounded-[24px] p-6 flex flex-col gap-8 min-h-[270px]"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-2">
              <p className="text-[12px] text-[#8f8f8f] leading-5 tracking-[-0.168px]" suppressHydrationWarning>
                {getGreeting()}, {userName}
              </p>
              <div className="flex items-center gap-3">
                <h1 className="font-bold text-[30px] leading-5 text-black tracking-[-0.42px]">
                  {formatMonth(month)}
                </h1>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setMonth((m) => offsetMonth(m, -1))}
                    className="flex items-center justify-center p-1.5 rounded hover:bg-black/5 transition-colors text-[#525252]"
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => !isCurrentMonth && setMonth((m) => offsetMonth(m, 1))}
                    disabled={isCurrentMonth}
                    className="flex items-center justify-center p-1.5 rounded hover:bg-black/5 transition-colors disabled:opacity-30 disabled:pointer-events-none text-[#525252]"
                  >
                    <HugeiconsIcon icon={ArrowRight01Icon} size={20} strokeWidth={1.5} />
                  </button>
                  <button className="flex items-center justify-center p-1.5 rounded hover:bg-black/5 transition-colors text-[#525252]">
                    <HugeiconsIcon icon={Calendar01Icon} size={20} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>

            {/* Add Transaction + Widget controls — opposite the month */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddTransaction(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium border bg-[#0A0A0A] text-white transition-all shadow-sm hover:bg-[#2C2C2C]"
                style={{ borderColor: '#0A0A0A' }}
              >
                <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} color="white" />
                Add transaction
              </button>
              <button
                onClick={() => setShowWidgetPanel((v) => !v)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium border bg-white transition-all shadow-sm"
                style={{
                  borderColor: showWidgetPanel ? '#0A0A0A' : '#ebebeb',
                  color: showWidgetPanel ? '#0A0A0A' : '#474747',
                }}
              >
                <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} />
                Add widget
              </button>
              <button
                onClick={() => window.location.href = '/settings'}
                className="flex items-center justify-center w-9 h-9 rounded-xl border bg-white transition-all shadow-sm hover:bg-[#f5f5f5]"
                style={{ borderColor: '#ebebeb' }}
                title="Manage categories"
              >
                <HugeiconsIcon icon={Settings01Icon} size={16} strokeWidth={1.5} color="#525252" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <MetricsCard month={month} />
          </div>
        </div>

        <div ref={containerRef} className="flex flex-col gap-4">
          {containerWidth > 0 && (
            <WidgetGrid
              month={month}
              containerWidth={containerWidth}
              excludeWidgets={['metrics']}
              hideToolbar
              externalShowPanel={showWidgetPanel}
              onPanelClose={() => setShowWidgetPanel(false)}
              externalShowAddTransaction={showAddTransaction}
              onAddTransactionClose={() => setShowAddTransaction(false)}
            />
          )}
        </div>
      </div>

    </div>
  );
}
