import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useToastStore, type ToastKind } from '../stores/toastStore';
import { cn } from '../lib/utils';

const KIND_ICON: Record<ToastKind, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
};

const KIND_STYLE: Record<ToastKind, string> = {
  info: 'border-border bg-card text-foreground',
  success: 'border-primary/40 bg-primary/10 text-foreground',
  error: 'border-destructive/50 bg-destructive/10 text-destructive',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => {
        const Icon = KIND_ICON[t.kind];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex min-w-[260px] max-w-sm items-start gap-2 rounded-md border px-3 py-2 shadow-card-hover',
              'animate-in fade-in-0 slide-in-from-right-2',
              KIND_STYLE[t.kind]
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} />
            <span className="flex-1 whitespace-pre-wrap break-words text-sm leading-snug">
              {t.message}
            </span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="關閉通知"
              className="mt-0.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
