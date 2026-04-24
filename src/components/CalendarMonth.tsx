import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Bell } from 'lucide-react';
import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { cn } from '../lib/utils';
import type { Task } from '../types/models';
import { taskWindowOverlaps, toUnix } from '../lib/datetime';
import { getLunarCellInfo } from '../lib/lunar';
import { useSettingsStore } from '../stores/settingsStore';

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const MAX_TASKS_PER_CELL = 3;

const ABBREVIATIONS: Record<string, string> = {
  '和平紀念日': '和平',
  '農曆年初一': '年初一',
  '農曆年初二': '年初二',
  '農曆年初三': '年初三',
};

function shortenLabel(raw: string): string {
  return ABBREVIATIONS[raw] ?? raw;
}

interface Props {
  tasks: Task[];
  reminderMap?: Record<number, { remindAt: number } | undefined>;
  onOpenTask: (task: Task) => void;
}

const priorityBarClass: Record<number, string> = {
  0: 'bg-[hsl(var(--prio-low))]',
  1: 'bg-[hsl(var(--prio-med))]',
  2: 'bg-[hsl(var(--prio-high))]',
  3: 'bg-[hsl(var(--prio-urgent))]',
};

export function CalendarMonth({ tasks, reminderMap, onOpenTask }: Props) {
  const [cursor, setCursor] = useState(() => new Date());
  const region = useSettingsStore((s) => s.region);

  const cells = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [cursor]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const day of cells) {
      const dayStartUnix = toUnix(startOfDay(day));
      const dayEndUnix = toUnix(endOfDay(day));
      const hits: Task[] = [];
      for (const t of tasks) {
        if (t.status === 'cancelled') continue;
        if (taskWindowOverlaps(t.start_at, t.due_at, dayStartUnix, dayEndUnix)) {
          hits.push(t);
        }
      }
      hits.sort((a, b) => {
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (b.status === 'done' && a.status !== 'done') return -1;
        return b.priority - a.priority;
      });
      map.set(day.toDateString(), hits);
    }
    return map;
  }, [cells, tasks]);

  const today = new Date();
  const yearLabel = format(cursor, 'yyyy');
  const monthNumber = format(cursor, 'M');

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-4 overflow-hidden px-6 pb-6 pt-2">
      {/* --- Header: big month number + year label + pill nav --- */}
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[42px] font-semibold leading-none tracking-[-0.03em] text-foreground">
            {monthNumber}
            <span className="ml-1 text-[18px] font-normal tracking-normal text-muted-foreground">
              月
            </span>
          </h1>
          <span className="font-cjk-ui text-[13px] font-medium tabular-nums text-muted-foreground">
            {yearLabel}
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/80 p-1 shadow-card backdrop-blur">
          <button
            type="button"
            aria-label="上個月"
            onClick={() => setCursor((c) => subMonths(c, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date())}
            className="rounded-full px-3 py-1 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            今天
          </button>
          <button
            type="button"
            aria-label="下個月"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* --- Calendar surface: borderless grid, card-like shell --- */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/70 shadow-float backdrop-blur-sm">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-border/30">
          {DAY_LABELS.map((l, i) => {
            const weekend = i >= 5;
            return (
              <div
                key={l}
                className={cn(
                  'font-cjk-ui py-3 text-center text-[10.5px] font-semibold uppercase tracking-[0.18em]',
                  weekend ? 'text-muted-foreground/80' : 'text-muted-foreground/90'
                )}
              >
                週{l}
              </div>
            );
          })}
        </div>

        {/* Day cells — no internal borders, use subtle hover/today/bg for separation */}
        <div
          className="grid flex-1 grid-cols-7 gap-px bg-border/25"
          style={{ gridTemplateRows: `repeat(${Math.ceil(cells.length / 7)}, minmax(96px, 1fr))` }}
        >
          {cells.map((day) => {
            const inCurMonth = isSameMonth(day, cursor);
            const isToday = isSameDay(day, today);
            const dayTasks = tasksByDay.get(day.toDateString()) ?? [];
            const overflow = Math.max(0, dayTasks.length - MAX_TASKS_PER_CELL);
            const info = getLunarCellInfo(day, region);

            const kindClass =
              info.kind === 'holiday'
                ? 'text-[hsl(0_65%_50%)] dark:text-[hsl(0_72%_72%)]'
                : info.kind === 'jieqi'
                ? 'text-[hsl(199_75%_40%)] dark:text-[hsl(199_72%_65%)]'
                : info.kind === 'month'
                ? 'text-foreground/75'
                : 'text-muted-foreground/75';

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'group relative flex min-h-0 flex-col gap-1 overflow-hidden p-2 transition-colors',
                  inCurMonth ? 'bg-card' : 'bg-muted/30',
                  'hover:bg-accent/40'
                )}
              >
                {/* Today glow under the cell */}
                {isToday && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'radial-gradient(120% 90% at 18% 18%, hsl(var(--primary) / 0.14), transparent 55%)',
                    }}
                  />
                )}

                <div className="relative flex items-baseline gap-1.5">
                  <span
                    className={cn(
                      'inline-flex h-[24px] min-w-[24px] items-center justify-center text-[14px] leading-none tabular-nums',
                      !inCurMonth && 'text-muted-foreground/45',
                      inCurMonth && !isToday && 'text-foreground',
                      isToday &&
                        'rounded-full bg-primary px-1 text-[13px] font-semibold text-primary-foreground shadow-[0_2px_8px_hsl(var(--primary)/0.35)] ring-2 ring-primary/15'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {info.label && (
                    <span
                      className={cn(
                        'font-cjk-ui min-w-0 truncate text-[11.5px] font-medium leading-[1.15] tracking-[0.02em]',
                        !inCurMonth && 'opacity-55',
                        kindClass
                      )}
                      title={info.label}
                    >
                      {shortenLabel(info.label)}
                    </span>
                  )}
                </div>

                <div className="relative flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
                  {dayTasks.slice(0, MAX_TASKS_PER_CELL).map((t) => {
                    const reminded = !!reminderMap?.[t.id];
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onOpenTask(t)}
                        title={t.title}
                        className={cn(
                          'group/chip relative flex min-w-0 items-center gap-1.5 overflow-hidden rounded-md bg-background/70 pl-2 pr-1.5 py-1 text-left text-[11px] leading-tight',
                          'border border-border/40 shadow-[0_1px_2px_hsl(220_13%_20%/0.04)]',
                          'transition-[background-color,border-color,box-shadow] duration-100 ease-out',
                          'hover:border-border hover:bg-background hover:shadow-[0_4px_10px_-2px_hsl(220_13%_20%/0.1)]',
                          t.status === 'done' && 'text-muted-foreground line-through opacity-55'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute left-0 top-1 bottom-1 w-[3px] rounded-full',
                            priorityBarClass[t.priority]
                          )}
                        />
                        <span className="ml-0.5 flex-1 truncate font-medium">{t.title}</span>
                        {reminded && t.status !== 'done' && (
                          <Bell className="h-2.5 w-2.5 shrink-0 text-primary" strokeWidth={2.5} />
                        )}
                      </button>
                    );
                  })}
                  {overflow > 0 && (
                    <span className="px-1 text-[10px] font-medium text-muted-foreground/80">
                      還有 {overflow} 項 →
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
