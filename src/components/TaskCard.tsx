import { Clock, Flame, Bell, CalendarRange } from 'lucide-react';
import { Checkbox } from './ui/Checkbox';
import { cn } from '../lib/utils';
import { formatSchedule } from '../lib/datetime';
import { PRIORITY_LABEL, type Task } from '../types/models';

interface TaskCardProps {
  task: Task;
  hasReminder?: boolean;
  subtaskProgress?: { done: number; total: number };
  onToggleDone: () => void;
  onOpen: () => void;
}

const priorityBarClass: Record<number, string> = {
  0: 'bg-[hsl(var(--prio-low))]',
  1: 'bg-[hsl(var(--prio-med))]',
  2: 'bg-[hsl(var(--prio-high))]',
  3: 'bg-[hsl(var(--prio-urgent))]',
};

export function TaskCard({ task, hasReminder, subtaskProgress, onToggleDone, onOpen }: TaskCardProps) {
  const done = task.status === 'done';
  const isOverdue = !done && task.due_at != null && task.due_at * 1000 < Date.now();
  const hasRange = task.start_at != null && task.due_at != null;
  const scheduleLabel = formatSchedule(task.start_at, task.due_at);
  const showPrioBadge = !done && task.priority !== 1 && task.priority !== 3;

  return (
    <div
      className={cn(
        'group relative flex gap-2.5 overflow-hidden rounded-lg border border-border/60 bg-card pl-[13px] pr-3 py-2.5 shadow-card',
        'transform-gpu will-change-transform',
        'transition-[transform,box-shadow,border-color] duration-150 ease-out',
        'hover:-translate-y-0.5 hover:shadow-card-hover hover:border-border',
        done && 'opacity-60'
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute left-0 top-0 bottom-0 w-[3px]',
          done ? 'bg-muted-foreground/30' : priorityBarClass[task.priority]
        )}
      />

      <div className="flex items-start pt-[3px]">
        <Checkbox
          checked={done}
          onChange={(e) => {
            e.stopPropagation();
            onToggleDone();
          }}
          aria-label={done ? '取消完成' : '標記為完成'}
        />
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="flex-1 min-w-0 rounded-sm text-left outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <div className="flex items-start gap-2">
          <span
            className={cn(
              'flex-1 text-[13px] font-medium leading-snug tracking-tight',
              done && 'text-muted-foreground line-through'
            )}
          >
            {task.title}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            {hasReminder && !done && (
              <Bell className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
            )}
            {task.priority === 3 && !done && (
              <Flame
                className="h-3.5 w-3.5 text-[hsl(var(--prio-urgent))]"
                strokeWidth={2.5}
              />
            )}
          </div>
        </div>

        {task.description && (
          <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        {subtaskProgress && subtaskProgress.total > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/80 transition-all"
                style={{
                  width: `${(subtaskProgress.done / subtaskProgress.total) * 100}%`,
                }}
              />
            </div>
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {subtaskProgress.done}/{subtaskProgress.total}
            </span>
          </div>
        )}

        {(scheduleLabel || showPrioBadge) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px]">
            {scheduleLabel && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium tabular-nums',
                  isOverdue
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {hasRange ? (
                  <CalendarRange className="h-3 w-3" strokeWidth={2.2} />
                ) : (
                  <Clock className="h-3 w-3" strokeWidth={2.2} />
                )}
                {scheduleLabel}
              </span>
            )}
            {showPrioBadge && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <span className={cn('h-1.5 w-1.5 rounded-full', priorityBarClass[task.priority])} />
                {PRIORITY_LABEL[task.priority]}
              </span>
            )}
          </div>
        )}
      </button>
    </div>
  );
}
