import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format, addDays, nextMonday, startOfDay, setHours, setMinutes } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { cn } from '../../lib/utils';

interface DateTimePickerProps {
  value: Date | null;
  onChange: (value: Date | null) => void;
  placeholder?: string;
  invalid?: boolean;
  id?: string;
  disabled?: boolean;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDisplay(d: Date): string {
  return `${format(d, 'yyyy/MM/dd')}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Snap "now" to the next :00 when giving a default time for presets.
function presetAt(base: Date, hour = 9, minute = 0): Date {
  return setMinutes(setHours(startOfDay(base), hour), minute);
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = '選擇時間',
  invalid,
  id,
  disabled,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => value ?? new Date());
  const [timeStr, setTimeStr] = useState<string>(() =>
    value ? `${pad(value.getHours())}:${pad(value.getMinutes())}` : '09:00'
  );
  const [align, setAlign] = useState<'left' | 'right'>('left');
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (value) {
      setTimeStr(`${pad(value.getHours())}:${pad(value.getMinutes())}`);
      setMonth(value);
    }
  }, [value]);

  // Auto-flip popover to stay inside the viewport.
  useLayoutEffect(() => {
    if (!open) return;
    const t = triggerRef.current;
    if (!t) return;
    const rect = t.getBoundingClientRect();
    const POPOVER_WIDTH = 280;
    const POPOVER_HEIGHT = 340;
    const PAD = 12;
    setAlign(rect.left + POPOVER_WIDTH > window.innerWidth - PAD ? 'right' : 'left');
    setPlacement(rect.bottom + POPOVER_HEIGHT > window.innerHeight - PAD ? 'top' : 'bottom');
  }, [open]);

  function applyDay(day: Date) {
    const [h, m] = timeStr.split(':').map((n) => Number(n));
    const merged = setMinutes(setHours(startOfDay(day), Number.isFinite(h) ? h : 9), Number.isFinite(m) ? m : 0);
    onChange(merged);
  }

  function applyTime(next: string) {
    setTimeStr(next);
    if (!value) return;
    const [h, m] = next.split(':').map((n) => Number(n));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return;
    const merged = setMinutes(setHours(startOfDay(value), h), m);
    onChange(merged);
  }

  function applyPreset(day: Date) {
    const [h, m] = timeStr.split(':').map((n) => Number(n));
    let merged = presetAt(day);
    if (Number.isFinite(h) && Number.isFinite(m)) {
      merged = setMinutes(setHours(startOfDay(day), h), m);
    }
    setMonth(merged);
    onChange(merged);
  }

  const now = new Date();
  const presets = [
    { label: '今天', date: now },
    { label: '明天', date: addDays(now, 1) },
    { label: '下週一', date: nextMonday(now) },
  ];

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-md border bg-background px-3 text-sm shadow-sm transition-colors',
          'hover:border-input/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          invalid
            ? 'border-destructive focus-visible:ring-destructive'
            : 'border-input',
          !value && 'text-muted-foreground'
        )}
      >
        <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={2.2} />
        <span className="flex-1 truncate text-left font-mono text-[13px]">
          {value ? formatDisplay(value) : placeholder}
        </span>
        {value && !disabled && (
          <span
            role="button"
            aria-label="清除"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
              setOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onChange(null);
                setOpen(false);
              }
            }}
            className="-mr-1 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute z-50 w-[280px] overflow-hidden rounded-lg border border-border bg-popover p-3 shadow-float',
            'animate-in fade-in-0 zoom-in-95',
            align === 'left' ? 'left-0' : 'right-0',
            placement === 'bottom' ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
          )}
        >
          <div className="mb-2 flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.date)}
                className="rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                {p.label}
              </button>
            ))}
          </div>

          <DayPicker
            mode="single"
            selected={value ?? undefined}
            onSelect={(d) => d && applyDay(d)}
            month={month}
            onMonthChange={setMonth}
            locale={zhTW}
            weekStartsOn={1}
            showOutsideDays
            className="rdp-tight"
          />

          <div className="mt-2 flex items-center gap-2 border-t border-border/60 pt-2">
            <span className="text-[11px] font-medium text-muted-foreground">時間</span>
            <input
              type="time"
              value={timeStr}
              onChange={(e) => applyTime(e.target.value)}
              className="h-7 rounded-md border border-input bg-background px-2 font-mono text-[12px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="ml-auto">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
