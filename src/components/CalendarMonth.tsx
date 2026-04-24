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
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { cn } from '../lib/utils';
import type { Task } from '../types/models';
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
  reminderMap?: Record<number, { remindAt: number } | undefined>;
  onOpenTask: (task: Task) => void;
}

const priorityPillClass: Record<number, string> = {
  0: 'bg-[hsl(220_14%_92%)] text-[hsl(220_9%_30%)] dark:bg-[hsl(220_13%_20%)] dark:text-[hsl(220_14%_86%)]',
  1: 'bg-[hsl(199_85%_92%)] text-[hsl(199_85%_28%)] dark:bg-[hsl(199_45%_22%)] dark:text-[hsl(199_80%_80%)]',
  2: 'bg-[hsl(35_95%_90%)]  text-[hsl(28_80%_32%)]  dark:bg-[hsl(28_55%_20%)]  dark:text-[hsl(35_90%_78%)]',
  3: 'bg-[hsl(0_85%_93%)]   text-[hsl(0_65%_40%)]   dark:bg-[hsl(0_45%_22%)]   dark:text-[hsl(0_75%_82%)]',
};

const priorityDotClass: Record<number, string> = {
  0: 'bg-[hsl(var(--prio-low))]',
  1: 'bg-[hsl(var(--prio-med))]',
  2: 'bg-[hsl(var(--prio-high))]',
  3: 'bg-[hsl(var(--prio-urgent))]',
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

  const hasTaskByDay = useMemo(() => {
    const set = new Set<string>();
    for (const day of cells) {
      for (const t of tasks) {
        if (t.status === 'cancelled') continue;
        if (taskCoversDay(t, day)) {
          set.add(day.toDateString());
          break;
        }
      }
    }
    return set;
  }, [cells, tasks]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-semibold leading-none text-foreground">
            {format(month, 'yyyy 年')}
          </span>
          <span className="text-[15px] font-semibold leading-none text-[hsl(0_70%_55%)] dark:text-[hsl(0_75%_72%)]">
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

      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {MINI_DAY_LABELS.map((l) => (
          <div
            key={l}
            className="font-cjk-ui pb-1 text-[10px] font-medium text-muted-foreground/75"
          >
            {l}
          </div>
        ))}
        {cells.map((day) => {
          const inCurMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, today);
          const has = hasTaskByDay.has(day.toDateString());
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                'relative flex h-7 items-center justify-center rounded-[5px] text-[11px] tabular-nums leading-none transition-colors',
                !inCurMonth && 'text-muted-foreground/40',
                inCurMonth && !isToday && 'text-foreground hover:bg-accent',
                isToday &&
                  'bg-[hsl(0_72%_52%)] font-semibold text-white hover:bg-[hsl(0_72%_48%)]'
              )}
            >
              {format(day, 'd')}
              {has && !isToday && (
                <span
                  aria-hidden
                  className="absolute bottom-[3px] left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-primary"
                />
              )}
            </button>
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
  reminderMap?: Record<number, { remindAt: number } | undefined>;
}) {
  const today = new Date();

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
      out.push({ date: d, tasks: hits });
    }
    return out;
  }, [tasks]);

  function headingFor(d: Date): string {
    const diff = differenceInCalendarDays(d, today);
    if (diff === 0) return `今天  ${format(d, 'M/d')}`;
    if (diff === 1) return `明天  ${format(d, 'M/d')}`;
    return `${format(d, 'EEEE', { locale: zhTW })}  ${format(d, 'M/d')}`;
  }

  return (
    <div className="space-y-4">
      {days.map(({ date, tasks: ts }) => (
        <div key={date.toDateString()}>
          <h3 className="font-cjk-ui mb-1 text-[10.5px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            {headingFor(date)}
          </h3>
          {ts.length === 0 ? (
            <p className="text-[11.5px] text-muted-foreground/60">—</p>
          ) : (
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
          )}
        </div>
      ))}
    </div>
  );
}

// ---- Today weather card (sidebar top) ----
function TodayWeatherCard() {
  const forecast = useWeatherStore((s) => s.forecast);
  const location = useWeatherStore((s) => s.location);
  const loading = useWeatherStore((s) => s.loading);
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const w = forecast.get(todayKey);

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-[20px] font-bold leading-none tracking-tight text-foreground">
          {format(today, 'M/d')}
        </span>
        <span className="font-cjk-ui text-[11.5px] font-medium text-muted-foreground">
          {format(today, 'EEEE', { locale: zhTW })}
        </span>
      </div>
      {w ? (
        (() => {
          const { Icon, label, tone } = describeWeather(w.code);
          return (
            <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-border/50 bg-card px-3 py-2 shadow-card">
              <Icon className={cn('h-6 w-6 shrink-0', WEATHER_TONE_CLASS[tone])} strokeWidth={1.8} />
              <div className="flex-1 min-w-0">
                <div className="font-cjk-ui text-[11.5px] font-medium text-foreground">{label}</div>
                {location?.city && (
                  <div className="truncate text-[10.5px] text-muted-foreground">{location.city}</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-[14px] font-semibold leading-none tabular-nums">{w.high}°</div>
                <div className="mt-0.5 text-[10.5px] leading-none text-muted-foreground tabular-nums">
                  {w.low}°
                </div>
              </div>
            </div>
          );
        })()
      ) : loading ? (
        <div className="mt-2 rounded-lg border border-border/50 bg-card px-3 py-2 text-[11px] text-muted-foreground">
          載入天氣…
        </div>
      ) : null}
    </div>
  );
}

function formatUpcomingTime(t: Task): string {
  if (t.start_at && t.due_at) {
    const s = new Date(t.start_at * 1000);
    const e = new Date(t.due_at * 1000);
    return `${format(s, 'HH:mm')}  –  ${format(e, 'HH:mm')}`;
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
export function CalendarMonth({ tasks, reminderMap, onOpenTask }: Props) {
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
  const monthNumber = format(cursor, 'M');
  const yearLabel = format(cursor, 'yyyy');

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* --- Sidebar --- */}
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-border/50 bg-muted/25 lg:flex">
        {/* Fixed top: weather + mini month */}
        <div className="shrink-0 space-y-5 border-b border-border/40 px-4 pt-4 pb-4">
          <TodayWeatherCard />
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
        {/* Header */}
        <div className="flex items-end justify-between px-6 pt-3 pb-3">
          <div className="flex items-baseline gap-2">
            <h1 className="text-[34px] font-bold leading-none tracking-[-0.03em] text-foreground">
              {monthNumber}
              <span className="ml-0.5 text-[22px] font-semibold text-muted-foreground/80">月</span>
            </h1>
            <span className="font-cjk-ui text-[14px] font-medium tabular-nums text-[hsl(0_70%_50%)] dark:text-[hsl(0_75%_68%)]">
              {yearLabel}
            </span>
          </div>

          <div className="flex items-center">
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
              className="rounded-md px-2.5 py-1 text-[12.5px] font-medium text-foreground transition-colors hover:bg-accent"
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
                  !rightEdge && 'border-r border-border/35',
                  !bottomEdge && 'border-b border-border/35',
                  !inCurMonth && 'bg-muted/15',
                  isToday && 'bg-[hsl(0_80%_96%)] dark:bg-[hsl(0_30%_15%)]'
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
                    const isRange = t.start_at != null && t.due_at != null;
                    const done = t.status === 'done';

                    if (isRange) {
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => onOpenTask(t)}
                          title={t.title}
                          className={cn(
                            'flex min-w-0 items-center gap-1 overflow-hidden rounded-[4px] px-1.5 py-[2px] text-left text-[11.5px] leading-[1.3]',
                            'transition-opacity duration-100 ease-out hover:opacity-85',
                            priorityPillClass[t.priority],
                            done && 'line-through opacity-50'
                          )}
                        >
                          <span className="flex-1 truncate font-medium">{t.title}</span>
                          {reminded && !done && (
                            <Bell className="h-2.5 w-2.5 shrink-0 opacity-80" strokeWidth={2.5} />
                          )}
                        </button>
                      );
                    }
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onOpenTask(t)}
                        title={t.title}
                        className={cn(
                          'flex min-w-0 items-center gap-1.5 overflow-hidden rounded-[3px] px-1 py-[1px] text-left text-[11.5px] leading-[1.3] text-foreground',
                          'transition-colors duration-100 ease-out hover:bg-accent',
                          done && 'text-muted-foreground line-through opacity-55'
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            'h-1.5 w-1.5 shrink-0 rounded-full',
                            priorityDotClass[t.priority]
                          )}
                        />
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
