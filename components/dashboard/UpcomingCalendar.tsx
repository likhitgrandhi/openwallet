'use client';

import { useSubscriptionStore } from '@/lib/store/useSubscriptionStore';
import { cn } from '@/lib/utils';

interface UpcomingCalendarProps {
  month: string;
}

function getDaysInMonth(monthStr: string): number {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function getFirstDayOfWeek(monthStr: string): number {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(y, m - 1, 1).getDay();
}

export function UpcomingCalendar({ month }: UpcomingCalendarProps) {
  const { subscriptions } = useSubscriptionStore();
  const daysInMonth = getDaysInMonth(month);
  const firstDay = getFirstDayOfWeek(month);
  const [year, monthNum] = month.split('-').map(Number);

  const subsByDay: Record<number, string[]> = {};
  for (const sub of subscriptions.filter((s) => s.isActive)) {
    const renewal = new Date(sub.nextRenewal);
    if (renewal.getFullYear() === year && renewal.getMonth() + 1 === monthNum) {
      const day = renewal.getDate();
      if (!subsByDay[day]) subsByDay[day] = [];
      subsByDay[day].push(sub.merchant);
    }
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === monthNum;
  const todayDate = today.getDate();
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9E9E9E] mb-4">
        Upcoming
      </p>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {days.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-[#ABABAB] py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const hasSubs = !!subsByDay[day];
          const isToday = isCurrentMonth && day === todayDate;

          return (
            <div
              key={day}
              className="relative flex flex-col items-center justify-center py-1"
              title={hasSubs ? subsByDay[day].join(', ') : undefined}
            >
              <span className={cn(
                'text-xs w-6 h-6 flex items-center justify-center rounded-full',
                isToday ? 'bg-[#173B34] text-white font-semibold' : 'text-[#6B6B6B]'
              )}>
                {day}
              </span>
              {hasSubs && (
                <span className="absolute bottom-0 w-1 h-1 rounded-full bg-[#D97B00]" />
              )}
            </div>
          );
        })}
      </div>

      {/* Upcoming subscriptions list */}
      {Object.keys(subsByDay).length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#E8E8E6] space-y-2">
          {Object.entries(subsByDay).map(([day, names]) => (
            <div key={day} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#D97B00] inline-block shrink-0" />
              <span className="text-xs text-[#6B6B6B]">
                <span className="font-medium text-[#1A1A1A]">{names.join(', ')}</span> renews on day {day}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
