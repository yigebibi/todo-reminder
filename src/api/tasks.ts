import { exec, nowSec, query, queryOne } from './db';
import type { Task, TaskCreateInput, TaskUpdateInput } from '../types/models';

export async function listTasks(): Promise<Task[]> {
  return query<Task>(
    `SELECT * FROM tasks
     ORDER BY
       CASE status WHEN 'done' THEN 1 ELSE 0 END,
       COALESCE(due_at, 99999999999) ASC,
       priority DESC,
       created_at DESC`
  );
}

export async function getTask(id: number): Promise<Task | null> {
  return queryOne<Task>('SELECT * FROM tasks WHERE id = ?', [id]);
}

export async function createTask(input: TaskCreateInput): Promise<Task> {
  const now = nowSec();
  const res = await exec(
    `INSERT INTO tasks (title, description, status, priority, due_at, created_at, updated_at)
     VALUES (?, ?, 'todo', ?, ?, ?, ?)`,
    [
      input.title.trim(),
      input.description ?? null,
      input.priority ?? 1,
      input.due_at ?? null,
      now,
      now,
    ]
  );
  const task = await getTask(res.lastInsertId as number);
  if (!task) throw new Error('創建任務失敗：查不到剛插入的記錄');
  return task;
}

export async function updateTask(id: number, patch: TaskUpdateInput): Promise<Task> {
  const fields: string[] = [];
  const params: unknown[] = [];

  if (patch.title !== undefined) {
    fields.push('title = ?');
    params.push(patch.title.trim());
  }
  if (patch.description !== undefined) {
    fields.push('description = ?');
    params.push(patch.description);
  }
  if (patch.status !== undefined) {
    fields.push('status = ?');
    params.push(patch.status);
    if (patch.status === 'done') {
      fields.push('completed_at = ?');
      params.push(nowSec());
    } else {
      fields.push('completed_at = NULL');
    }
  }
  if (patch.priority !== undefined) {
    fields.push('priority = ?');
    params.push(patch.priority);
  }
  if (patch.due_at !== undefined) {
    fields.push('due_at = ?');
    params.push(patch.due_at);
  }

  if (fields.length === 0) {
    const existing = await getTask(id);
    if (!existing) throw new Error(`任務 ${id} 不存在`);
    return existing;
  }

  fields.push('updated_at = ?');
  params.push(nowSec());
  params.push(id);

  await exec(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, params);
  const task = await getTask(id);
  if (!task) throw new Error(`更新後找不到任務 ${id}`);
  return task;
}

export async function completeTask(id: number): Promise<Task> {
  return updateTask(id, { status: 'done' });
}

export async function uncompleteTask(id: number): Promise<Task> {
  return updateTask(id, { status: 'todo' });
}

export async function deleteTask(id: number): Promise<void> {
  await exec('DELETE FROM tasks WHERE id = ?', [id]);
}
