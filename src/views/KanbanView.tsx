import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Sparkles,
  CalendarDays,
  CalendarRange,
  ListTodo,
  CheckCheck,
  Search,
  X,
  Columns3,
  Calendar as CalendarIcon,
} from 'lucide-react';
import * as chrono from 'chrono-node';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TaskCard } from '../components/TaskCard';
import { TaskForm, type TaskFormValues } from '../components/TaskForm';
import { CalendarMonth } from '../components/CalendarMonth';
import {
  selectBacklog,
  selectDone7d,
  selectThisWeek,
  selectToday,
  useTaskStore,
} from '../stores/taskStore';
import { toUnix } from '../lib/datetime';
import { onAppEvent } from '../lib/events';
import { toast } from '../stores/toastStore';
import type { Task } from '../types/models';
import { cn } from '../lib/utils';

type ColumnKey = 'today' | 'week' | 'backlog' | 'done';
type ViewMode = 'kanban' | 'calendar';

import type { LucideIcon } from 'lucide-react';

const COLUMNS: {
  key: ColumnKey;
  label: string;
  icon: LucideIcon;
  accent: string;
  headerDot: string;
  emptyHint: string;
}[] = [
  {
    key: 'today',
    label: '今天',
    icon: CalendarDays,
    accent: 'bg-[hsl(var(--col-today-bg))]',
    headerDot: 'bg-[hsl(var(--col-today-accent))]',
    emptyHint: '今天沒事～',
  },
  {
    key: 'week',
    label: '本週',
    icon: CalendarRange,
    accent: 'bg-[hsl(var(--col-week-bg))]',
    headerDot: 'bg-[hsl(var(--col-week-accent))]',
    emptyHint: '本週沒事',
  },
  {
    key: 'backlog',
    label: '待辦',
    icon: ListTodo,
    accent: 'bg-[hsl(var(--col-backlog-bg))]',
    headerDot: 'bg-[hsl(var(--col-backlog-accent))]',
    emptyHint: '沒有待辦',
  },
  {
    key: 'done',
    label: '近 7 天完成',
    icon: CheckCheck,
    accent: 'bg-[hsl(var(--col-done-bg))]',
    headerDot: 'bg-[hsl(var(--col-done-accent))]',
    emptyHint: '還沒有完成的任務',
  },
];

function matchesQuery(task: Task, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  if (task.title.toLowerCase().includes(needle)) return true;
  if (task.description?.toLowerCase().includes(needle)) return true;
  return false;
}

export function KanbanView() {
  const tasks = useTaskStore((s) => s.tasks);
  const reminderMap = useTaskStore((s) => s.reminderMap);
  const loading = useTaskStore((s) => s.loading);
  const error = useTaskStore((s) => s.error);
  const loadAll = useTaskStore((s) => s.loadAll);
  const add = useTaskStore((s) => s.add);
  const patch = useTaskStore((s) => s.patch);
  const complete = useTaskStore((s) => s.complete);
  const uncomplete = useTaskStore((s) => s.uncomplete);
  const remove = useTaskStore((s) => s.remove);
  const setReminder = useTaskStore((s) => s.setReminder);
  const clearReminder = useTaskStore((s) => s.clearReminder);

  const [quickTitle, setQuickTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editing, setEditing] = useState<Task | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Surface store errors via toast (load/save failures etc.).
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // Global shortcut integration: Ctrl+N opens new task dialog; Ctrl+F focuses search.
  useEffect(() => {
    const offNew = onAppEvent('app:newTask', () => openCreate());
    const offFocus = onAppEvent('app:focusSearch', () => {
      const el = searchInputRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    });
    return () => {
      offNew();
      offFocus();
    };
  }, []);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return tasks;
    return tasks.filter((t) => matchesQuery(t, q));
  }, [tasks, searchQuery]);

  const columns = useMemo(() => {
    const state = useTaskStore.getState();
    const buckets = {
      today: selectToday(state),
      week: selectThisWeek(state),
      backlog: selectBacklog(state),
      done: selectDone7d(state),
    };
    const q = searchQuery.trim();
    if (!q) return buckets;
    return {
      today: buckets.today.filter((t) => matchesQuery(t, q)),
      week: buckets.week.filter((t) => matchesQuery(t, q)),
      backlog: buckets.backlog.filter((t) => matchesQuery(t, q)),
      done: buckets.done.filter((t) => matchesQuery(t, q)),
    };
  }, [tasks, searchQuery]);

  const totalMatches =
    columns.today.length + columns.week.length + columns.backlog.length + columns.done.length;

  const showOnboarding = !loading && tasks.length === 0 && !searchQuery;
  const showNoResults = !loading && searchQuery && totalMatches === 0;

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    try {
      const parsed = chrono.parseDate(title, new Date(), { forwardDate: true });
      await add({ title, due_at: parsed ? toUnix(parsed) : null });
      setQuickTitle('');
      toast.success('任務已新增');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setFormOpen(true);
  }

  async function handleFormSubmit(values: TaskFormValues) {
    try {
      const { reminder_offset, ...taskInput } = values;
      let taskId: number;
      if (editing) {
        const updated = await patch(editing.id, taskInput);
        taskId = updated.id;
      } else {
        const created = await add(taskInput);
        taskId = created.id;
      }
      if (values.due_at != null && reminder_offset != null) {
        await setReminder(taskId, values.due_at, reminder_offset);
      } else {
        await clearReminder(taskId);
      }
      toast.success(editing ? '任務已更新' : '任務已新增');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      throw e;
    }
  }

  async function handleFormDelete() {
    if (!editing) return;
    try {
      await remove(editing.id);
      toast.success('任務已刪除');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      throw e;
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 bg-background/70 px-6 py-3 space-y-2.5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-border/60 bg-card p-0.5 shadow-card">
            <ViewTab
              active={viewMode === 'kanban'}
              onClick={() => setViewMode('kanban')}
              icon={<Columns3 className="h-3.5 w-3.5" />}
              label="看板"
            />
            <ViewTab
              active={viewMode === 'calendar'}
              onClick={() => setViewMode('calendar')}
              icon={<CalendarIcon className="h-3.5 w-3.5" />}
              label="月曆"
            />
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋 ⌃F"
              className="pl-9 pr-8"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="清除搜尋"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleQuickAdd} className="flex gap-2">
          <div className="relative flex-1">
            <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary/70" />
            <Input
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder='輸入任務與時間，如：「明天下午 3 點跟 Kevin 開會」'
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={!quickTitle.trim()}>
            <Plus className="mr-1 h-4 w-4" />
            新增
          </Button>
          <Button type="button" variant="outline" onClick={openCreate} title="Ctrl+N">
            進階
          </Button>
        </form>
      </div>

      {showOnboarding ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border/60 bg-card p-8 text-center shadow-float">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-20 h-40 opacity-70"
              style={{
                background:
                  'radial-gradient(60% 60% at 50% 50%, hsl(var(--primary) / 0.22), transparent 70%)',
              }}
            />
            <div className="relative flex flex-col items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 ring-1 ring-primary/20">
                <Sparkles className="h-6 w-6 text-primary" strokeWidth={2.2} />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-semibold tracking-tight">歡迎使用 Todo Reminder</h2>
                <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                  在上方輸入任務，試試自然語言──「明天下午 3 點交週報」會自動幫你設截止時間。
                </p>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <kbd className="rounded border border-border/70 bg-background px-1.5 py-0.5 font-mono shadow-card">Ctrl</kbd>
                <span>+</span>
                <kbd className="rounded border border-border/70 bg-background px-1.5 py-0.5 font-mono shadow-card">N</kbd>
                <span className="ml-1">開啟進階表單</span>
              </div>
            </div>
          </div>
        </div>
      ) : showNoResults ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            沒有符合「{searchQuery}」的任務
          </p>
          <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
            清除搜尋
          </Button>
        </div>
      ) : viewMode === 'calendar' ? (
        <CalendarMonth
          tasks={filteredTasks}
          reminderMap={reminderMap}
          onOpenTask={openEdit}
        />
      ) : (
        <div className="grid flex-1 grid-cols-4 gap-4 overflow-hidden px-6 py-5">
          {COLUMNS.map((col) => {
            const items = columns[col.key];
            const Icon = col.icon;
            return (
              <div
                key={col.key}
                className={cn(
                  'flex min-h-0 flex-col rounded-xl border border-border/50',
                  col.accent
                )}
              >
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', col.headerDot)} />
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.2} />
                    <h3 className="text-[13px] font-semibold">{col.label}</h3>
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-2">
                  {items.length === 0 ? (
                    <div className="mt-8 flex flex-col items-center gap-2 py-8 text-center">
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-border/70',
                          'text-muted-foreground/70'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="text-[11px] text-muted-foreground">{col.emptyHint}</p>
                    </div>
                  ) : (
                    items.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        hasReminder={!!reminderMap[task.id]}
                        onToggleDone={() =>
                          task.status === 'done' ? uncomplete(task.id) : complete(task.id)
                        }
                        onOpen={() => openEdit(task)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="mx-6 mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && tasks.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60 text-sm text-muted-foreground">
          載入中…
        </div>
      )}

      <TaskForm
        open={formOpen}
        task={editing}
        initialReminderOffset={editing ? reminderMap[editing.id]?.offsetMinutes ?? null : null}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        onDelete={editing ? handleFormDelete : undefined}
      />
    </div>
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
        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-all',
        active
          ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      {icon}
      {label}
    </button>
  );
}
