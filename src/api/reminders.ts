import { exec, query } from './db';
import type { Reminder } from '../types/models';

export async function listRemindersByTask(taskId: number): Promise<Reminder[]> {
  return query<Reminder>(
    'SELECT * FROM reminders WHERE task_id = ? ORDER BY remind_at ASC',
    [taskId]
  );
}

export async function hasActiveReminder(taskId: number): Promise<boolean> {
  const rows = await query<{ cnt: number }>(
    'SELECT COUNT(*) AS cnt FROM reminders WHERE task_id = ? AND fired = 0',
    [taskId]
  );
  return (rows[0]?.cnt ?? 0) > 0;
}

export async function deleteRemindersForTask(taskId: number): Promise<void> {
  await exec('DELETE FROM reminders WHERE task_id = ?', [taskId]);
}

export async function deletePendingRemindersForTask(taskId: number): Promise<void> {
  await exec('DELETE FROM reminders WHERE task_id = ? AND fired = 0', [taskId]);
}

export async function listPendingOffsets(taskId: number): Promise<number[]> {
  const rows = await query<{ offset_minutes: number | null }>(
    `SELECT offset_minutes FROM reminders
     WHERE task_id = ? AND fired = 0 AND offset_minutes IS NOT NULL
     ORDER BY offset_minutes DESC`,
    [taskId]
  );
  return rows.map((r) => r.offset_minutes as number);
}

/**
 * Replace all pending (unfired) reminders with a new set relative to due_at.
 * Fired reminders are preserved.
 */
export async function syncPendingReminders(
  taskId: number,
  dueAt: number,
  offsetMinutesList: number[]
): Promise<void> {
  await deletePendingRemindersForTask(taskId);
  const unique = [...new Set(offsetMinutesList)].filter((o) => o > 0);
  for (const offset of unique) {
    const remindAt = dueAt - offset * 60;
    await exec(
      `INSERT INTO reminders (task_id, remind_at, offset_minutes, fired)
       VALUES (?, ?, ?, 0)`,
      [taskId, remindAt, offset]
    );
  }
}
