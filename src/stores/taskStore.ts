import { create } from 'zustand';
import type { Task, TaskCreateInput, TaskUpdateInput, Tag } from '../types/models';
import * as api from '../api/tasks';
import * as remindersApi from '../api/reminders';
import * as subtasksApi from '../api/subtasks';
import * as tagsApi from '../api/tags';
import { recentDays, taskCoversThisWeek, taskCoversToday } from '../lib/datetime';

interface ReminderInfo {
  remindAt: number;
  offsetMinutes: number | null;
  fired: boolean;
}

export interface SubtaskProgress {
  done: number;
  total: number;
}

interface TaskStore {
  tasks: Task[];
  reminderMap: Record<number, ReminderInfo | undefined>;
  subtaskCountMap: Record<number, SubtaskProgress | undefined>;
  taskTagMap: Record<number, Tag[] | undefined>;
  loading: boolean;
  error: string | null;

  loadAll: () => Promise<void>;
  add: (input: TaskCreateInput) => Promise<Task>;
  patch: (id: number, input: TaskUpdateInput) => Promise<Task>;
  complete: (id: number) => Promise<void>;
  uncomplete: (id: number) => Promise<void>;
  remove: (id: number) => Promise<void>;

  setReminder: (taskId: number, dueAt: number, offsetMinutes: number) => Promise<void>;
  clearReminder: (taskId: number) => Promise<void>;
  refreshReminder: (taskId: number) => Promise<void>;
  refreshSubtaskCounts: (taskId?: number) => Promise<void>;
  refreshTaskTags: (taskId?: number) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  reminderMap: {},
  subtaskCountMap: {},
  taskTagMap: {},
  loading: false,
  error: null,

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const [tasks, subtaskCounts, taskTagMap] = await Promise.all([
        api.listTasks(),
        subtasksApi.listSubtaskCounts(),
        tagsApi.listTaskTagsMap(),
      ]);
      const reminderMap: Record<number, ReminderInfo> = {};
      for (const task of tasks) {
        const reminders = await remindersApi.listRemindersByTask(task.id);
        const active = reminders.find((r) => r.fired === 0);
        if (active) {
          reminderMap[task.id] = {
            remindAt: active.remind_at,
            offsetMinutes: active.offset_minutes,
            fired: false,
          };
        }
      }
      const subtaskCountMap: Record<number, SubtaskProgress> = {};
      for (const row of subtaskCounts) {
        subtaskCountMap[row.task_id] = { done: row.done, total: row.total };
      }
      set({ tasks, reminderMap, subtaskCountMap, taskTagMap, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false });
    }
  },

  add: async (input) => {
    const created = await api.createTask(input);
    set({ tasks: [created, ...get().tasks] });
    return created;
  },

  patch: async (id, input) => {
    const updated = await api.updateTask(id, input);
    set({ tasks: get().tasks.map((t) => (t.id === id ? updated : t)) });
    return updated;
  },

  complete: async (id) => {
    const done = await api.completeTask(id);
    set({ tasks: get().tasks.map((t) => (t.id === id ? done : t)) });
    // Completed task: clear any pending reminder in the map (it will still be in DB until user deletes task)
    const map = { ...get().reminderMap };
    delete map[id];
    set({ reminderMap: map });
  },

  uncomplete: async (id) => {
    const open = await api.uncompleteTask(id);
    set({ tasks: get().tasks.map((t) => (t.id === id ? open : t)) });
    await get().refreshReminder(id);
  },

  remove: async (id) => {
    await api.deleteTask(id);
    const map = { ...get().reminderMap };
    delete map[id];
    const subtaskMap = { ...get().subtaskCountMap };
    delete subtaskMap[id];
    const tagMap = { ...get().taskTagMap };
    delete tagMap[id];
    set({
      tasks: get().tasks.filter((t) => t.id !== id),
      reminderMap: map,
      subtaskCountMap: subtaskMap,
      taskTagMap: tagMap,
    });
  },

  setReminder: async (taskId, dueAt, offsetMinutes) => {
    const remindAt = dueAt - offsetMinutes * 60;
    await remindersApi.upsertPrimaryReminder(taskId, remindAt, offsetMinutes);
    set({
      reminderMap: {
        ...get().reminderMap,
        [taskId]: { remindAt, offsetMinutes, fired: false },
      },
    });
  },

  clearReminder: async (taskId) => {
    await remindersApi.deleteRemindersForTask(taskId);
    const map = { ...get().reminderMap };
    delete map[taskId];
    set({ reminderMap: map });
  },

  refreshReminder: async (taskId) => {
    const reminders = await remindersApi.listRemindersByTask(taskId);
    const active = reminders.find((r) => r.fired === 0);
    const map = { ...get().reminderMap };
    if (active) {
      map[taskId] = {
        remindAt: active.remind_at,
        offsetMinutes: active.offset_minutes,
        fired: false,
      };
    } else {
      delete map[taskId];
    }
    set({ reminderMap: map });
  },

  refreshSubtaskCounts: async (taskId) => {
    if (taskId != null) {
      const rows = await subtasksApi.listSubtasks(taskId);
      const map = { ...get().subtaskCountMap };
      if (rows.length === 0) {
        delete map[taskId];
      } else {
        map[taskId] = {
          done: rows.filter((s) => s.done === 1).length,
          total: rows.length,
        };
      }
      set({ subtaskCountMap: map });
      return;
    }

    const counts = await subtasksApi.listSubtaskCounts();
    const map: Record<number, SubtaskProgress> = {};
    for (const row of counts) {
      map[row.task_id] = { done: row.done, total: row.total };
    }
    set({ subtaskCountMap: map });
  },

  refreshTaskTags: async (taskId) => {
    if (taskId != null) {
      const tags = await tagsApi.getTaskTags(taskId);
      const map = { ...get().taskTagMap };
      if (tags.length === 0) {
        delete map[taskId];
      } else {
        map[taskId] = tags;
      }
      set({ taskTagMap: map });
      return;
    }

    const taskTagMap = await tagsApi.listTaskTagsMap();
    set({ taskTagMap });
  },
}));

// ---- Selectors for Kanban columns ----
// A task now has an optional (start_at, due_at) window. Buckets reflect whether
// the task's window overlaps each time range; "today" wins over "week", "week"
// wins over "backlog", so a task spanning multi-days shows up in the earliest
// relevant column only.

const isOpen = (t: Task) => t.status !== 'done' && t.status !== 'cancelled';

export const selectToday = (s: TaskStore) =>
  s.tasks.filter((t) => isOpen(t) && taskCoversToday(t.start_at, t.due_at));

export const selectThisWeek = (s: TaskStore) =>
  s.tasks.filter(
    (t) =>
      isOpen(t) &&
      !taskCoversToday(t.start_at, t.due_at) &&
      taskCoversThisWeek(t.start_at, t.due_at)
  );

export const selectBacklog = (s: TaskStore) =>
  s.tasks.filter(
    (t) =>
      isOpen(t) &&
      !taskCoversToday(t.start_at, t.due_at) &&
      !taskCoversThisWeek(t.start_at, t.due_at)
  );

export const selectDone7d = (s: TaskStore) => {
  const since = recentDays(7);
  return s.tasks.filter((t) => t.status === 'done' && (t.completed_at ?? 0) >= since);
};
