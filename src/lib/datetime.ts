// Time helpers. DB stores Unix seconds; UI shows local time.
import {
  endOfDay,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
  startOfWeek,
  subDays,
} from 'date-fns';

export function fromUnix(sec: number | null | undefined): Date | null {
  if (sec == null) return null;
  return new Date(sec * 1000);
}

export function toUnix(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

export function formatDue(sec: number | null | undefined): string {
  const d = fromUnix(sec);
  if (!d) return '';
  const now = new Date();
  if (isSameDay(d, now)) return format(d, 'HH:mm');
  return format(d, 'MM/dd HH:mm');
}

export function isToday(sec: number | null | undefined): boolean {
  const d = fromUnix(sec);
  return d ? isSameDay(d, new Date()) : false;
}

export function isThisWeek(sec: number | null | undefined): boolean {
  const d = fromUnix(sec);
  if (!d) return false;
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  return !isBefore(d, weekStart) && !isAfter(d, weekEnd);
}

export function todayRange(): [number, number] {
  const now = new Date();
  return [toUnix(startOfDay(now)), toUnix(endOfDay(now))];
}

export function thisWeekRange(): [number, number] {
  const now = new Date();
  return [
    toUnix(startOfWeek(now, { weekStartsOn: 1 })),
    toUnix(endOfWeek(now, { weekStartsOn: 1 })),
  ];
}

export function recentDays(days: number): number {
  return toUnix(subDays(new Date(), days));
}

// --- Task-window helpers ---
// A task has an optional [start_at, due_at] window. Rules:
//   both set         -> closed range [start, due]
//   only due set     -> single-point "pinned" to due
//   only start set   -> open-ended range [start, +inf)
//   neither          -> unscheduled (never overlaps any window)

export function taskWindowOverlaps(
  start: number | null | undefined,
  due: number | null | undefined,
  windowStart: number,
  windowEnd: number
): boolean {
  if (start == null && due == null) return false;
  if (start != null && due != null) {
    return start <= windowEnd && due >= windowStart;
  }
  if (due != null /* && start == null */) {
    return due >= windowStart && due <= windowEnd;
  }
  // start != null && due == null
  return (start as number) <= windowEnd;
}

export function taskCoversToday(
  start: number | null | undefined,
  due: number | null | undefined
): boolean {
  const [s, e] = todayRange();
  return taskWindowOverlaps(start, due, s, e);
}

export function taskCoversThisWeek(
  start: number | null | undefined,
  due: number | null | undefined
): boolean {
  const [s, e] = thisWeekRange();
  return taskWindowOverlaps(start, due, s, e);
}

// Format a task's schedule for cards. Returns "" when fully unscheduled.
// Single day: "15:30" (today) or "04/28 15:30"
// Range same day: "04/28 09:00–15:30"
// Range across days: "04/23 – 04/28"
// Start only: "從 04/23 開始"
export function formatSchedule(
  start: number | null | undefined,
  due: number | null | undefined
): string {
  if (start == null && due == null) return '';
  if (start != null && due != null) {
    const s = fromUnix(start)!;
    const d = fromUnix(due)!;
    if (isSameDay(s, d)) {
      return `${format(s, 'MM/dd HH:mm')}–${format(d, 'HH:mm')}`;
    }
    return `${format(s, 'MM/dd')} – ${format(d, 'MM/dd')}`;
  }
  if (due != null) {
    return formatDue(due);
  }
  // start only
  const s = fromUnix(start!)!;
  return `從 ${format(s, 'MM/dd')} 開始`;
}
