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

export function recentDays(days: number): number {
  return toUnix(subDays(new Date(), days));
}
