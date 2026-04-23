import { useEffect, useState } from 'react';
import { CheckCircle2, Settings } from 'lucide-react';
import { TitleBar } from './components/TitleBar';
import { KanbanView } from './views/KanbanView';
import { SettingsDialog } from './components/SettingsDialog';
import { Toaster } from './components/Toaster';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useSettingsStore } from './stores/settingsStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { cn } from './lib/utils';

function App() {
  const theme = useSettingsStore((s) => s.theme);
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
            <div className="flex items-center gap-2 px-0.5">
              <CheckCircle2 className="h-4 w-4 text-primary" strokeWidth={2.5} />
              <span className="text-[13px] font-semibold tracking-tight">Todo Reminder</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                v0.1
              </span>
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

        <main className="relative flex-1 overflow-hidden">
          <KanbanView />
        </main>

        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        <Toaster />
      </div>
    </ErrorBoundary>
  );
}

export default App;
