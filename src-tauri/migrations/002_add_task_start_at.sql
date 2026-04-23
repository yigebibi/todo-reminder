-- Add an optional start_at to tasks to support time ranges (e.g. "4/23-4/28 do SQL refactor").
-- Semantics:
--   start_at = NULL and due_at set      -> single-point task (behaves like before)
--   start_at set and due_at set         -> task active window [start_at, due_at]
--   start_at set and due_at = NULL      -> task starts on start_at, no deadline
--   start_at = NULL and due_at = NULL   -> unscheduled (shows in backlog)
ALTER TABLE tasks ADD COLUMN start_at INTEGER;
CREATE INDEX IF NOT EXISTS idx_tasks_start ON tasks(start_at);
