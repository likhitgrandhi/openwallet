'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { Home01Icon, SparklesIcon, Target01Icon, Settings01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Home', href: '/', icon: Home01Icon },
  { label: 'AI', href: '/ai', icon: SparklesIcon },
  { label: 'Plan', href: '/plan', icon: Target01Icon },
  { label: 'Settings', href: '/settings', icon: Settings01Icon },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    /* Figma: left-[24px], vertically centered, gap-[7px] between buttons */
    <div className="fixed left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-[7px]">
      {NAV.map(({ label, href, icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={label}
            href={href}
            title={label}
            className={cn(
              'flex items-center justify-center p-2 rounded-full transition-colors',
              active
                ? 'bg-[#F7F7F7] border border-[#E4E4E4]'
                : 'bg-white hover:bg-[#F7F7F7]'
            )}
          >
            <HugeiconsIcon
              icon={icon}
              size={20}
              strokeWidth={active ? 2 : 1.5}
              color={active ? '#0A0A0A' : '#525252'}
            />
          </Link>
        );
      })}
    </div>
  );
}
