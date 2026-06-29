import { exec, nowSec, query } from './db';
import type { Subtask } from '../types/models';

export interface SubtaskCount {
  task_id: number;
  total: number;
  done: number;
}

export async function listSubtaskCounts(): Promise<SubtaskCount[]> {
  return query<SubtaskCount>(
    `SELECT task_id, COUNT(*) AS total, COALESCE(SUM(done), 0) AS done
     FROM subtasks GROUP BY task_id`
  );
}

export async function listSubtasks(taskId: number): Promise<Subtask[]> {
  return query<Subtask>(
    `SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC, id ASC`,
    [taskId]
  );
}

export async function createSubtask(taskId: number, title: string): Promise<void> {
  const now = nowSec();
  const [{ max_order }] = await query<{ max_order: number | null }>(
    `SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM subtasks WHERE task_id = ?`,
    [taskId]
  );
  await exec(
    `INSERT INTO subtasks (task_id, title, done, sort_order, created_at)
     VALUES (?, ?, 0, ?, ?)`,
    [taskId, title.trim(), (max_order ?? -1) + 1, now]
  );
}

export async function toggleSubtask(id: number, done: boolean): Promise<void> {
  await exec('UPDATE subtasks SET done = ? WHERE id = ?', [done ? 1 : 0, id]);
}

export async function renameSubtask(id: number, title: string): Promise<void> {
  await exec('UPDATE subtasks SET title = ? WHERE id = ?', [title.trim(), id]);
}

export async function deleteSubtask(id: number): Promise<void> {
  await exec('DELETE FROM subtasks WHERE id = ?', [id]);
}

export async function moveSubtask(id: number, direction: 'up' | 'down'): Promise<void> {
  const [current] = await query<Subtask>('SELECT * FROM subtasks WHERE id = ?', [id]);
  if (!current) return;

  const siblings = await listSubtasks(current.task_id);
  const idx = siblings.findIndex((s) => s.id === id);
  if (idx < 0) return;

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return;

  const neighbor = siblings[swapIdx];
  await exec('UPDATE subtasks SET sort_order = ? WHERE id = ?', [neighbor.sort_order, current.id]);
  await exec('UPDATE subtasks SET sort_order = ? WHERE id = ?', [current.sort_order, neighbor.id]);
}
