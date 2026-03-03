'use client';

import { MonthSwitcher } from './MonthSwitcher';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowReloadHorizontalIcon, User02Icon, Logout01Icon } from '@hugeicons/core-free-icons';
import { authClient } from '@/lib/auth-client';
import { useSyncStore } from '@/lib/store/useSyncStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  currentMonth?: string;
  title?: string;
  showMonthSwitcher?: boolean;
}

export function Header({ currentMonth, title, showMonthSwitcher = false }: HeaderProps) {
  const { data: session } = authClient.useSession();
  const { startSync, syncStatus } = useSyncStore();
  const isSyncing = syncStatus === 'running';

  const handleSync = async () => {
    if (!session?.user || isSyncing) return;
    const result = await authClient.getAccessToken({ providerId: 'google' });
    const accessToken = result.data?.accessToken;
    if (!accessToken) return;
    startSync(accessToken);
  };

  const userImage = session?.user?.image ?? undefined;
  const userName = session?.user?.name ?? 'Demo';

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="text-sm font-semibold text-gray-900">{title}</h1>
        )}
        {showMonthSwitcher && currentMonth && (
          <MonthSwitcher currentMonth={currentMonth} />
        )}
      </div>

      <div className="flex items-center gap-2">
        {session ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="text-xs gap-1.5 border-gray-200 text-gray-600 hover:text-gray-900 h-7 px-3 disabled:opacity-60"
          >
            <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={12} strokeWidth={1.5} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing…' : 'Sync Gmail'}
          </Button>
        ) : (
          <span className="text-xs text-gray-400 px-2">Demo mode</span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center cursor-pointer overflow-hidden hover:border-gray-300 transition-colors">
              {userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userImage} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <HugeiconsIcon icon={User02Icon} size={14} strokeWidth={1.5} className="text-gray-500" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {session && (
              <>
                <div className="px-3 py-2">
                  <p className="text-xs font-medium text-gray-900 truncate">{userName}</p>
                  <p className="text-xs text-gray-400 truncate">{session.user?.email}</p>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            {session ? (
              <DropdownMenuItem
                onClick={async () => { await authClient.signOut(); window.location.href = '/login'; }}
                className="text-xs text-red-600 focus:text-red-700 cursor-pointer"
              >
                <HugeiconsIcon icon={Logout01Icon} size={14} strokeWidth={1.5} className="mr-2" />
                Sign out
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => window.location.href = '/login'}
                className="text-xs cursor-pointer"
              >
                Sign in with Google
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
