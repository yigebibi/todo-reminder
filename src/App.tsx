import { useEffect, useState } from 'react';
import { CheckCircle2, Settings, Columns3, Calendar as CalendarIcon } from 'lucide-react';
import { TitleBar } from './components/TitleBar';
import { KanbanView } from './views/KanbanView';
import { SettingsDialog } from './components/SettingsDialog';
import { Toaster } from './components/Toaster';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppToolbar } from './components/AppToolbar';
import { useSettingsStore } from './stores/settingsStore';
import { useUIStore, type ViewMode } from './stores/uiStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { cn } from './lib/utils';

function App() {
  const theme = useSettingsStore((s) => s.theme);
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useKeyboardShortcuts();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <ErrorBoundary>
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <TitleBar
          left={
            <div className="flex items-center gap-4 px-0.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" strokeWidth={2.5} />
                <span className="text-[13px] font-semibold tracking-tight">Todo Reminder</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  v0.2
                </span>
              </div>
              <div
                data-tauri-drag-region="false"
                className="inline-flex rounded-md bg-muted/60 p-[2px] ring-1 ring-inset ring-border/40"
              >
                <ViewTab
                  active={viewMode === 'kanban'}
                  onClick={() => setViewMode('kanban')}
                  icon={<Columns3 className="h-3 w-3" />}
                  label="看板"
                />
                <ViewTab
                  active={viewMode === 'calendar'}
                  onClick={() => setViewMode('calendar')}
                  icon={<CalendarIcon className="h-3 w-3" />}
                  label="月曆"
                />
              </div>
            </div>
          }
          right={
            <button
              onClick={() => setSettingsOpen(true)}
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground',
                'hover:bg-accent hover:text-accent-foreground transition-colors'
              )}
              aria-label="設定"
              title="設定"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          }
        />

        <AppToolbar />

        <main className="relative flex-1 overflow-hidden">
          <KanbanView />
        </main>

        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        <Toaster />
      </div>
    </ErrorBoundary>
  );
}

function ViewTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1 rounded-[5px] px-2.5 py-0.5 text-[11.5px] font-medium transition-all duration-150',
        active
          ? 'bg-background text-foreground shadow-[0_1px_2px_hsl(220_13%_20%/0.08),0_0_0_0.5px_hsl(220_13%_20%/0.1)] dark:bg-card dark:shadow-[0_1px_2px_hsl(0_0%_0%/0.35)]'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// Re-export ViewMode to keep imports working elsewhere
export type { ViewMode };

export default App;
