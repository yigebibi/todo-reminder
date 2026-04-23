import { Clock, Flame, Bell, CalendarRange } from 'lucide-react';
import { Checkbox } from './ui/Checkbox';
import { cn } from '../lib/utils';
import { formatSchedule } from '../lib/datetime';
import { PRIORITY_LABEL, type Task } from '../types/models';

interface TaskCardProps {
  task: Task;
  hasReminder?: boolean;
  onToggleDone: () => void;
  onOpen: () => void;
}

const priorityDotClass: Record<number, string> = {
  0: 'bg-[hsl(var(--prio-low))]',
  1: 'bg-[hsl(var(--prio-med))]',
  2: 'bg-[hsl(var(--prio-high))]',
  3: 'bg-[hsl(var(--prio-urgent))]',
};

export function TaskCard({ task, hasReminder, onToggleDone, onOpen }: TaskCardProps) {
  const done = task.status === 'done';
  const isOverdue = !done && task.due_at != null && task.due_at * 1000 < Date.now();
  const hasRange = task.start_at != null && task.due_at != null;
  const scheduleLabel = formatSchedule(task.start_at, task.due_at);

  return (
    <div
      className={cn(
        'group relative flex gap-2.5 rounded-lg border border-border/70 bg-card px-3 py-2.5 shadow-card transition-all duration-150',
        'hover:-translate-y-0.5 hover:shadow-card-hover hover:border-border',
        done && 'opacity-60'
      )}
    >
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
        className="flex-1 min-w-0 text-left outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
      >
        <div className="flex items-start gap-2">
          <span
            className={cn(
              'flex-1 text-sm font-medium leading-snug',
              done && 'line-through text-muted-foreground'
            )}
          >
            {task.title}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            {hasReminder && (
              <Bell className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
            )}
            {task.priority === 3 && (
              <Flame
                className="h-3.5 w-3.5 text-[hsl(var(--prio-urgent))]"
                strokeWidth={2.5}
              />
            )}
          </div>
        </div>

        {task.description && (
          <p className="mt-1 text-[12px] leading-snug text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
          {scheduleLabel && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded px-1.5 py-0.5',
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
          {task.priority !== 1 && task.priority !== 3 && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <span className={cn('h-1.5 w-1.5 rounded-full', priorityDotClass[task.priority])} />
              {PRIORITY_LABEL[task.priority]}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}
