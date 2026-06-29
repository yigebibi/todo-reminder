import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Bell, Circle, Clock } from 'lucide-react';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getISOWeek,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { cn } from '../lib/utils';
import type { Tag, Task } from '../types/models';
import { TagDot } from './TagChip';
import { taskWindowOverlaps, toUnix } from '../lib/datetime';
import { getLunarCellInfo } from '../lib/lunar';
import { useSettingsStore } from '../stores/settingsStore';
import { useWeatherStore } from '../stores/weatherStore';
import { describeWeather, WEATHER_TONE_CLASS } from '../lib/weather';

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const MINI_DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const MAX_TASKS_PER_CELL = 4;
const UPCOMING_DAYS = 7;

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
  reminderMap?: Record<number, unknown>;
  taskTagMap?: Record<number, Tag[] | undefined>;
  onOpenTask: (task: Task) => void;
}

function taskTitleWithTags(task: Task, tags?: Tag[]): string {
  if (!tags?.length) return task.title;
  return `${task.title} · ${tags.map((t) => t.name).join(', ')}`;
}

const priorityPillClass: Record<number, string> = {
  0: 'bg-[hsl(220_14%_92%)] text-[hsl(220_9%_30%)] dark:bg-[hsl(220_13%_20%)] dark:text-[hsl(220_14%_86%)]',
  1: 'bg-[hsl(199_85%_92%)] text-[hsl(199_85%_28%)] dark:bg-[hsl(199_45%_22%)] dark:text-[hsl(199_80%_80%)]',
  2: 'bg-[hsl(35_95%_90%)]  text-[hsl(28_80%_32%)]  dark:bg-[hsl(28_55%_20%)]  dark:text-[hsl(35_90%_78%)]',
  3: 'bg-[hsl(0_85%_93%)]   text-[hsl(0_65%_40%)]   dark:bg-[hsl(0_45%_22%)]   dark:text-[hsl(0_75%_82%)]',
};

// Helper: does a task overlap a given day?
function taskCoversDay(t: Task, day: Date): boolean {
  const s = toUnix(startOfDay(day));
  const e = toUnix(endOfDay(day));
  return taskWindowOverlaps(t.start_at, t.due_at, s, e);
}

// ---- Mini month (sidebar) ----
function MiniMonth({
  month,
  tasks,
  onPrev,
  onNext,
  onSelectDay,
}: {
  month: Date;
  tasks: Task[];
  onPrev: () => void;
  onNext: () => void;
  onSelectDay: (d: Date) => void;
}) {
  const today = new Date();

  const cells = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const out: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }, [month]);

  // Group cells into weeks for per-row CW + row-highlight rendering.
  const weeks = useMemo(() => {
    const out: Date[][] = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
    return out;
  }, [cells]);

  // Per-day dot list: up to 3 small dots colored by task priority (descending).
  const dotsByDay = useMemo(() => {
    const colorClass = (p: number) =>
      p === 3 ? 'bg-[hsl(var(--prio-urgent))]'
      : p === 2 ? 'bg-[hsl(var(--prio-high))]'
      : p === 1 ? 'bg-[hsl(var(--prio-med))]'
      : 'bg-[hsl(var(--prio-low))]';
    const m = new Map<string, string[]>();
    for (const day of cells) {
      const hits: number[] = [];
      for (const t of tasks) {
        if (t.status === 'cancelled' || t.status === 'done') continue;
        if (!taskCoversDay(t, day)) continue;
        hits.push(t.priority);
      }
      if (hits.length === 0) continue;
      hits.sort((a, b) => b - a);
      m.set(day.toDateString(), hits.slice(0, 3).map(colorClass));
    }
    return m;
  }, [cells, tasks]);

  return (
    <div>
      {/* Title: "2026  4月" side-by-side with nav both on right (Fantastical). */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-[14px] font-semibold leading-none">{format(month, 'yyyy')}</span>
          <span className="text-[14px] font-semibold leading-none text-[hsl(0_75%_66%)]">
            {format(month, 'M 月')}
          </span>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            aria-label="上個月"
            onClick={onPrev}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-3 w-3" strokeWidth={2.2} />
          </button>
          <button
            type="button"
            aria-label="下個月"
            onClick={onNext}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className="h-3 w-3" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* 8 columns: 1 CW + 7 days */}
      <div className="grid grid-cols-[18px_repeat(7,1fr)] gap-y-0.5 text-center">
        <div className="font-cjk-ui pb-1 text-right text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60">
          CW
        </div>
        {MINI_DAY_LABELS.map((l) => (
          <div
            key={l}
            className="font-cjk-ui pb-1 text-[10px] font-medium text-muted-foreground/75"
          >
            {l}
          </div>
        ))}

        {weeks.map((week, wi) => {
          const weekNum = getISOWeek(week[0]);
          const isCurrentWeek = week.some((d) => isSameDay(d, today));
          return (
            <div
              key={wi}
              className={cn(
                'col-span-8 grid grid-cols-[18px_repeat(7,1fr)] rounded-md',
                isCurrentWeek && 'bg-[hsl(210_100%_65%/0.32)]'
              )}
            >
              <div className="flex h-7 items-center justify-end pr-1 text-[9.5px] tabular-nums text-muted-foreground/60">
                {weekNum}
              </div>
              {week.map((day) => {
                const inCurMonth = isSameMonth(day, month);
                const isToday = isSameDay(day, today);
                const dots = dotsByDay.get(day.toDateString());
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => onSelectDay(day)}
                    className={cn(
                      'relative flex h-7 items-center justify-center rounded-[5px] text-[11px] tabular-nums leading-none transition-colors',
                      !inCurMonth && 'text-muted-foreground/40',
                      inCurMonth && !isToday && 'text-foreground hover:bg-white/10',
                      isToday &&
                        'bg-[hsl(0_72%_52%)] font-semibold text-white hover:bg-[hsl(0_72%_48%)]'
                    )}
                  >
                    {format(day, 'd')}
                    {dots && !isToday && (
                      <span
                        aria-hidden
                        className="absolute bottom-[2px] left-1/2 flex -translate-x-1/2 gap-[2px]"
                      >
                        {dots.map((c, i) => (
                          <span key={i} className={cn('h-[3px] w-[3px] rounded-full', c)} />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Upcoming events list (sidebar) ----
function UpcomingList({
  tasks,
  onOpenTask,
  reminderMap,
}: {
  tasks: Task[];
  onOpenTask: (t: Task) => void;
  reminderMap?: Record<number, unknown>;
}) {
  const today = new Date();
  const forecast = useWeatherStore((s) => s.forecast);

  const days = useMemo(() => {
    const out: { date: Date; tasks: Task[] }[] = [];
    for (let i = 0; i < UPCOMING_DAYS; i++) {
      const d = addDays(today, i);
      const hits = tasks
        .filter((t) => t.status !== 'cancelled' && taskCoversDay(t, d))
        .sort((a, b) => {
          if (a.status === 'done' && b.status !== 'done') return 1;
          if (b.status === 'done' && a.status !== 'done') return -1;
          const at = a.due_at ?? a.start_at ?? Infinity;
          const bt = b.due_at ?? b.start_at ?? Infinity;
          return at - bt;
        });
      if (hits.length > 0) out.push({ date: d, tasks: hits });
    }
    return out;
  }, [tasks]);

  function headingFor(d: Date): string {
    const diff = differenceInCalendarDays(d, today);
    const dayName = diff === 0 ? '今天' : diff === 1 ? '明天' : format(d, 'EEEE', { locale: zhTW });
    return `${dayName}  ${format(d, 'M/d')}`;
  }

  if (days.length === 0) {
    return (
      <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-border/70">
          <Clock className="h-4 w-4 text-muted-foreground/60" strokeWidth={2.2} />
        </div>
        <p className="text-[11.5px] text-muted-foreground/70">
          近 7 天沒有日程
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {days.map(({ date, tasks: ts }) => {
        const w = forecast.get(format(date, 'yyyy-MM-dd'));
        const wd = w ? describeWeather(w.code) : null;
        return (
        <div key={date.toDateString()}>
          <h3 className="font-cjk-ui mb-1 flex items-center justify-between gap-2 text-[10.5px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            <span>{headingFor(date)}</span>
            {wd && w && (
              <span className={cn('flex items-center gap-1 tabular-nums normal-case tracking-normal font-medium', WEATHER_TONE_CLASS[wd.tone])}>
                <wd.Icon className="h-3 w-3" strokeWidth={2.2} />
                <span>{w.high}°/{w.low}°</span>
              </span>
            )}
          </h3>
          <ul className="space-y-1">
              {ts.map((t) => {
                const done = t.status === 'done';
                const timeStr = formatUpcomingTime(t);
                const reminded = !!reminderMap?.[t.id];
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => onOpenTask(t)}
                      className={cn(
                        'group flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-accent/60',
                        done && 'opacity-60'
                      )}
                    >
                      {done ? (
                        <div className="mt-0.5 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-muted-foreground/30">
                          <span className="block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        </div>
                      ) : (
                        <Circle
                          className={cn(
                            'mt-0.5 h-3 w-3 shrink-0',
                            t.priority === 3
                              ? 'text-[hsl(var(--prio-urgent))]'
                              : t.priority === 2
                              ? 'text-[hsl(var(--prio-high))]'
                              : t.priority === 1
                              ? 'text-[hsl(var(--prio-med))]'
                              : 'text-muted-foreground'
                          )}
                          strokeWidth={2.5}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        {timeStr && (
                          <div className="flex items-center gap-1 text-[10.5px] font-medium text-muted-foreground tabular-nums">
                            <Clock className="h-2.5 w-2.5" strokeWidth={2.5} />
                            {timeStr}
                          </div>
                        )}
                        <div
                          className={cn(
                            'text-[12px] leading-tight',
                            done ? 'line-through text-muted-foreground' : 'text-foreground'
                          )}
                        >
                          {t.title}
                        </div>
                      </div>
                      {reminded && !done && (
                        <Bell className="mt-0.5 h-2.5 w-2.5 shrink-0 text-primary" strokeWidth={2.5} />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
        </div>
        );
      })}
    </div>
  );
}

function formatUpcomingTime(t: Task): string {
  if (t.start_at && t.due_at) {
    const s = new Date(t.start_at * 1000);
    const e = new Date(t.due_at * 1000);
    const sameDay = s.toDateString() === e.toDateString();
    const sStr = format(s, 'HH:mm');
    const eStr = format(e, 'HH:mm');
    if (sStr === eStr) return sStr; // single moment
    if (sameDay) return `${sStr}  –  ${eStr}`; // intra-day range
    return '全天'; // multi-day spanning task — no specific time on this date
  }
  if (t.due_at) {
    return format(new Date(t.due_at * 1000), 'HH:mm');
  }
  if (t.start_at) {
    return `${format(new Date(t.start_at * 1000), 'HH:mm')} 起`;
  }
  return '';
}

// ---- Main CalendarMonth (sidebar + grid) ----
export function CalendarMonth({ tasks, reminderMap, taskTagMap, onOpenTask }: Props) {
  const [cursor, setCursor] = useState(() => new Date());
  const region = useSettingsStore((s) => s.region);
  const weather = useWeatherStore((s) => s.forecast);
  const loadWeather = useWeatherStore((s) => s.load);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

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

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* --- Sidebar: always dark for Fantastical-style contrast against main --- */}
      <aside
        className="dark hidden w-[260px] shrink-0 flex-col border-r lg:flex"
        style={{
          background: 'hsl(224 28% 9%)',
          borderColor: 'hsl(224 20% 18%)',
          color: 'hsl(220 14% 92%)',
        }}
      >
        {/* Fixed top: mini month only (weather integrates into upcoming headings) */}
        <div
          className="shrink-0 border-b px-4 pt-4 pb-4"
          style={{ borderColor: 'hsl(224 18% 16%)' }}
        >
          <MiniMonth
            month={cursor}
            tasks={tasks}
            onPrev={() => setCursor((c) => subMonths(c, 1))}
            onNext={() => setCursor((c) => addMonths(c, 1))}
            onSelectDay={(d) => setCursor(d)}
          />
        </div>

        {/* Scrollable: upcoming events */}
        <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <UpcomingList
            tasks={tasks}
            onOpenTask={onOpenTask}
            reminderMap={reminderMap}
          />
        </div>
      </aside>

      {/* --- Main --- */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Minimal toolbar: just nav — month label comes from cell boundaries like Fantastical */}
        <div className="flex items-center gap-1 border-b border-border/40 bg-muted/20 px-4 py-1.5">
          <button
            type="button"
            aria-label="上個月"
            onClick={() => setCursor((c) => subMonths(c, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date())}
            className="rounded-md px-3 py-1 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            今天
          </button>
          <button
            type="button"
            aria-label="下個月"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 border-t border-b border-border/50 bg-background/40">
          {DAY_LABELS.map((l) => (
            <div
              key={l}
              className="font-cjk-ui py-1.5 pr-3 text-right text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/85"
            >
              週{l}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div
          className="grid flex-1 grid-cols-7 overflow-hidden"
          style={{ gridTemplateRows: `repeat(${Math.ceil(cells.length / 7)}, minmax(92px, 1fr))` }}
        >
          {cells.map((day, idx) => {
            const inCurMonth = isSameMonth(day, cursor);
            const isToday = isSameDay(day, today);
            const isMonthStart = day.getDate() === 1;
            const dayOfWeek = idx % 7;
            const rightEdge = dayOfWeek === 6;
            const bottomEdge = idx >= cells.length - 7;
            const dayTasks = tasksByDay.get(day.toDateString()) ?? [];
            const overflow = Math.max(0, dayTasks.length - MAX_TASKS_PER_CELL);
            const info = getLunarCellInfo(day, region);

            const kindClass =
              info.kind === 'holiday'
                ? 'text-[hsl(0_65%_48%)] dark:text-[hsl(0_72%_72%)]'
                : info.kind === 'jieqi'
                ? 'text-[hsl(199_75%_38%)] dark:text-[hsl(199_72%_65%)]'
                : info.kind === 'month'
                ? 'text-foreground/70'
                : 'text-muted-foreground/75';

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'relative flex min-h-0 flex-col overflow-hidden px-1.5 pt-1 pb-1',
                  !rightEdge && 'border-r border-border/25',
                  !bottomEdge && 'border-b border-border/25',
                  !inCurMonth && 'bg-muted/15',
                  isToday && 'bg-[hsl(210_70%_96%)] dark:bg-[hsl(210_25%_14%)]'
                )}
              >
                <div className="flex items-baseline gap-1.5 px-0.5">
                  <span
                    className={cn(
                      'shrink-0 tabular-nums leading-none',
                      isMonthStart ? 'text-[12px] font-semibold' : 'text-[13px]',
                      isToday &&
                        'flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[hsl(0_72%_52%)] px-1 text-[12px] font-semibold text-white',
                      !isToday && inCurMonth && !isMonthStart && 'font-medium text-foreground',
                      !isToday && inCurMonth && isMonthStart && 'text-foreground',
                      !isToday && !inCurMonth && 'text-muted-foreground/50'
                    )}
                  >
                    {isMonthStart && !isToday ? `${format(day, 'M')}月${format(day, 'd')}日` : format(day, 'd')}
                  </span>
                  {(() => {
                    const w = weather.get(format(day, 'yyyy-MM-dd'));
                    if (!w) return null;
                    const { Icon, tone } = describeWeather(w.code);
                    return (
                      <Icon
                        className={cn(
                          'h-3 w-3 shrink-0',
                          WEATHER_TONE_CLASS[tone],
                          !inCurMonth && 'opacity-55'
                        )}
                        strokeWidth={2}
                      />
                    );
                  })()}
                  {info.label && (
                    <span
                      className={cn(
                        'font-cjk-ui min-w-0 truncate text-[11px] font-medium leading-[1.15] tracking-[0.02em]',
                        !inCurMonth && 'opacity-55',
                        kindClass
                      )}
                      title={info.label}
                    >
                      {shortenLabel(info.label)}
                    </span>
                  )}
                </div>

                <div className="mt-1 flex min-h-0 flex-1 flex-col gap-[3px] overflow-hidden">
                  {dayTasks.slice(0, MAX_TASKS_PER_CELL).map((t) => {
                    const reminded = !!reminderMap?.[t.id];
                    const tags = taskTagMap?.[t.id];
                    const firstTag = tags?.[0];
                    const isRange = t.start_at != null && t.due_at != null;
                    const done = t.status === 'done';

                    if (isRange) {
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => onOpenTask(t)}
                          title={taskTitleWithTags(t, tags)}
                          className={cn(
                            'flex min-w-0 items-center gap-1 overflow-hidden rounded-[4px] px-1.5 py-[2px] text-left text-[11.5px] leading-[1.3]',
                            'transition-opacity duration-100 ease-out hover:opacity-85',
                            priorityPillClass[t.priority],
                            done && 'line-through opacity-50'
                          )}
                        >
                          {firstTag && <TagDot color={firstTag.color} className="h-1.5 w-1.5" />}
                          <span className="flex-1 truncate font-medium">{t.title}</span>
                          {reminded && !done && (
                            <Bell className="h-2.5 w-2.5 shrink-0 opacity-80" strokeWidth={2.5} />
                          )}
                        </button>
                      );
                    }
                    const priorityStrokeClass =
                      t.priority === 3
                        ? 'text-[hsl(var(--prio-urgent))]'
                        : t.priority === 2
                        ? 'text-[hsl(var(--prio-high))]'
                        : t.priority === 1
                        ? 'text-[hsl(var(--prio-med))]'
                        : 'text-muted-foreground';
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onOpenTask(t)}
                        title={taskTitleWithTags(t, tags)}
                        className={cn(
                          'flex min-w-0 items-center gap-1.5 overflow-hidden rounded-[3px] px-1 py-[1px] text-left text-[11.5px] leading-[1.3] text-foreground',
                          'transition-colors duration-100 ease-out hover:bg-accent',
                          done && 'text-muted-foreground line-through opacity-55'
                        )}
                      >
                        {firstTag ? (
                          <TagDot color={firstTag.color} className="h-2 w-2" />
                        ) : (
                          <Circle
                            className={cn('h-2.5 w-2.5 shrink-0', priorityStrokeClass)}
                            strokeWidth={2.5}
                          />
                        )}
                        <span className="flex-1 truncate">{t.title}</span>
                        {reminded && !done && (
                          <Bell className="h-2.5 w-2.5 shrink-0 text-primary" strokeWidth={2.5} />
                        )}
                      </button>
                    );
                  })}
                  {overflow > 0 && (
                    <span className="px-1 text-[10.5px] font-medium text-muted-foreground/75">
                      還有 {overflow} 項
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
