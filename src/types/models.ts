// Data model types — mirror of src-tauri/migrations/001_init.sql
// All time fields are Unix seconds (INTEGER in SQLite).

export type TaskStatus = 'todo' | 'doing' | 'done' | 'cancelled';

export const PRIORITY = {
  LOW: 0,
  MED: 1,
  HIGH: 2,
  URGENT: 3,
} as const;

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];

export const PRIORITY_LABEL: Record<Priority, string> = {
  0: '低',
  1: '中',
  2: '高',
  3: '緊急',
};

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  start_at: number | null;
  due_at: number | null;
  completed_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface TaskCreateInput {
  title: string;
  description?: string | null;
  priority?: Priority;
  start_at?: number | null;
  due_at?: number | null;
}

export interface TaskUpdateInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  start_at?: number | null;
  due_at?: number | null;
}

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  done: 0 | 1;
  sort_order: number;
  created_at: number;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface Reminder {
  id: number;
  task_id: number;
  remind_at: number;
  offset_minutes: number | null;
  fired: 0 | 1;
}

export interface ActivityLogEntry {
  id: number;
  task_id: number | null;
  action: string;
  payload: string | null;
  created_at: number;
}
