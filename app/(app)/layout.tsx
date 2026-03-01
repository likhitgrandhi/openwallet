import { DataProvider } from '@/components/shared/DataProvider';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { SyncDrawer } from '@/components/shared/SyncDrawer';
import { AICommandOverlay } from '@/components/ai/AICommandOverlay';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      <ThemeProvider>
        <div className="min-h-screen relative" style={{ backgroundColor: 'var(--page-bg, #ffffff)' }}>
          <Sidebar />
          {children}
          <SyncDrawer />
          <AICommandOverlay />
        </div>
      </ThemeProvider>
    </DataProvider>
  );
}
