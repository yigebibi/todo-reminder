import { useEffect, useState, type ReactNode } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { cn } from '../lib/utils';

interface TitleBarProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
}

export function TitleBar({ left, center, right }: TitleBarProps) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let unlisten: (() => void) | null = null;
    appWindow.isMaximized().then(setMaximized);
    appWindow.onResized(async () => setMaximized(await appWindow.isMaximized())).then((u) => {
      unlisten = u;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  const win = () => getCurrentWindow();

  return (
    <div
      data-tauri-drag-region
      className="flex h-10 shrink-0 select-none items-center justify-between border-b border-border/60 bg-background/80 pl-4 pr-0 backdrop-blur"
    >
      <div data-tauri-drag-region className="flex flex-1 items-center gap-3">
        {left}
      </div>
      <div data-tauri-drag-region className="flex items-center">{center}</div>
      <div className="flex items-center gap-1 pr-1">
        {right}
        <div className="mx-1 h-4 w-px bg-border/60" />
        <WindowButton ariaLabel="最小化" onClick={() => win().minimize()}>
          <Minus className="h-3.5 w-3.5" />
        </WindowButton>
        <WindowButton
          ariaLabel={maximized ? '還原' : '最大化'}
          onClick={() => win().toggleMaximize()}
        >
          {maximized ? <Copy className="h-3 w-3 -scale-x-100" /> : <Square className="h-3 w-3" />}
        </WindowButton>
        <WindowButton ariaLabel="關閉" onClick={() => win().close()} danger>
          <X className="h-3.5 w-3.5" />
        </WindowButton>
      </div>
    </div>
  );
}

function WindowButton({
  children,
  onClick,
  ariaLabel,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  ariaLabel: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'inline-flex h-10 w-11 items-center justify-center text-muted-foreground transition-colors',
        danger
          ? 'hover:bg-destructive hover:text-destructive-foreground'
          : 'hover:bg-accent hover:text-accent-foreground'
      )}
    >
      {children}
    </button>
  );
}
