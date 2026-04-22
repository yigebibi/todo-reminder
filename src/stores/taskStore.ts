import { create } from 'zustand';
import type { Task, TaskCreateInput, TaskUpdateInput } from '../types/models';
import * as api from '../api/tasks';
import * as remindersApi from '../api/reminders';
import { isThisWeek, isToday, recentDays } from '../lib/datetime';

interface ReminderInfo {
  remindAt: number;
  offsetMinutes: number | null;
  fired: boolean;
}

interface TaskStore {
  tasks: Task[];
  reminderMap: Record<number, ReminderInfo | undefined>;
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
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  reminderMap: {},
  loading: false,
  error: null,

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const tasks = await api.listTasks();
      // Load reminders for all tasks (single query would be nicer; do one-shot multi for now)
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
      set({ tasks, reminderMap, loading: false });
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
    set({
      tasks: get().tasks.filter((t) => t.id !== id),
      reminderMap: map,
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
}));

// ---- Selectors for Kanban columns ----

export const selectToday = (s: TaskStore) =>
  s.tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled' && isToday(t.due_at));

export const selectThisWeek = (s: TaskStore) =>
  s.tasks.filter(
    (t) =>
      t.status !== 'done' &&
      t.status !== 'cancelled' &&
      !isToday(t.due_at) &&
      isThisWeek(t.due_at)
  );

export const selectBacklog = (s: TaskStore) =>
  s.tasks.filter(
    (t) =>
      t.status !== 'done' &&
      t.status !== 'cancelled' &&
      !isToday(t.due_at) &&
      !isThisWeek(t.due_at)
  );

export const selectDone7d = (s: TaskStore) => {
  const since = recentDays(7);
  return s.tasks.filter((t) => t.status === 'done' && (t.completed_at ?? 0) >= since);
};
