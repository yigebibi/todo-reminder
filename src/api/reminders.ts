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

/**
 * Replace all reminders for a task with a single one.
 * Pass null offset_minutes for absolute timestamp, or pass both offset and remind_at.
 */
export async function upsertPrimaryReminder(
  taskId: number,
  remindAt: number,
  offsetMinutes: number | null
): Promise<void> {
  await deleteRemindersForTask(taskId);
  await exec(
    `INSERT INTO reminders (task_id, remind_at, offset_minutes, fired)
     VALUES (?, ?, ?, 0)`,
    [taskId, remindAt, offsetMinutes]
  );
}
