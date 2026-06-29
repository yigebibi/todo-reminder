import { exec, query } from './db';
import type { Tag } from '../types/models';

export async function listTags(): Promise<Tag[]> {
  return query<Tag>('SELECT * FROM tags ORDER BY name');
}

export async function createTag(name: string, color = '#6B7280'): Promise<void> {
  await exec(
    `INSERT INTO tags (name, color) VALUES (?, ?)
     ON CONFLICT(name) DO UPDATE SET color = excluded.color`,
    [name.trim(), color]
  );
}

export async function deleteTag(id: number): Promise<void> {
  await exec('DELETE FROM tags WHERE id = ?', [id]);
}

export async function updateTagColor(id: number, color: string): Promise<void> {
  await exec('UPDATE tags SET color = ? WHERE id = ?', [color, id]);
}

interface TaskTagRow extends Tag {
  task_id: number;
}

export async function listTaskTagsMap(): Promise<Record<number, Tag[]>> {
  const rows = await query<TaskTagRow>(
    `SELECT tt.task_id, t.id, t.name, t.color
     FROM task_tags tt
     INNER JOIN tags t ON t.id = tt.tag_id
     ORDER BY t.name`
  );
  const map: Record<number, Tag[]> = {};
  for (const row of rows) {
    const { task_id, ...tag } = row;
    if (!map[task_id]) map[task_id] = [];
    map[task_id].push(tag);
  }
  return map;
}

export async function getTaskTags(taskId: number): Promise<Tag[]> {
  return query<Tag>(
    `SELECT t.* FROM tags t
     INNER JOIN task_tags tt ON tt.tag_id = t.id
     WHERE tt.task_id = ?
     ORDER BY t.name`,
    [taskId]
  );
}

export async function assignTag(taskId: number, tagId: number): Promise<void> {
  await exec(
    `INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)
     ON CONFLICT(task_id, tag_id) DO NOTHING`,
    [taskId, tagId]
  );
}

export async function unassignTag(taskId: number, tagId: number): Promise<void> {
  await exec('DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?', [taskId, tagId]);
}
