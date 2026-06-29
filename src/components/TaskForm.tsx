import { useEffect, useMemo, useState } from 'react';
import { Trash2, Bell, BellOff, CalendarClock, Flag } from 'lucide-react';
import * as chrono from 'chrono-node';
import { Dialog } from './ui/Dialog';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { DateTimePicker } from './ui/DateTimePicker';
import { fromUnix, toUnix } from '../lib/datetime';
import { PRIORITY, PRIORITY_LABEL, type Priority, type Task } from '../types/models';
import { cn } from '../lib/utils';
import { SubtaskList } from './SubtaskList';

type ReminderOffset = 'none' | 5 | 15 | 60 | 1440;

const REMINDER_PRESETS: { value: ReminderOffset; label: string }[] = [
  { value: 'none', label: '不提醒' },
  { value: 5, label: '提前 5 分鐘' },
  { value: 15, label: '提前 15 分鐘' },
  { value: 60, label: '提前 1 小時' },
  { value: 1440, label: '提前 1 天' },
];

export interface TaskFormValues {
  title: string;
  description: string | null;
  priority: Priority;
  start_at: number | null;
  due_at: number | null;
  reminder_offset: number | null; // minutes before due_at; null = no reminder
  subtask_titles: string[];
}

interface TaskFormProps {
  open: boolean;
  task?: Task | null;
  initialReminderOffset?: number | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TaskFormValues) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onSubtaskProgressChange?: () => void;
}

export function TaskForm({
  open,
  task,
  initialReminderOffset,
  onOpenChange,
  onSubmit,
  onDelete,
  onSubtaskProgressChange,
}: TaskFormProps) {
  const isEdit = !!task;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(PRIORITY.MED);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [reminder, setReminder] = useState<ReminderOffset>('none');
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [draftSubtaskTitles, setDraftSubtaskTitles] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? '');
      setDescription(task?.description ?? '');
      setPriority((task?.priority as Priority) ?? PRIORITY.MED);
      setStartDate(fromUnix(task?.start_at ?? null));
      setDueDate(fromUnix(task?.due_at ?? null));
      const initReminder = initialReminderOffset;
      if (initReminder != null && REMINDER_PRESETS.some((p) => p.value === initReminder)) {
        setReminder(initReminder as ReminderOffset);
      } else {
        setReminder('none');
      }
      setConfirmingDelete(false);
      setDraftSubtaskTitles([]);
    }
  }, [open, task, initialReminderOffset]);

  // Autofill due_at from natural-language in the title, when both start/due
  // are still empty and user is creating a fresh task (not editing).
  useEffect(() => {
    if (dueDate || startDate || !title || isEdit) return;
    const parsed = chrono.parseDate(title, new Date(), { forwardDate: true });
    if (parsed) setDueDate(parsed);
  }, [title, dueDate, startDate, isEdit]);

  const hasDueAt = dueDate != null;
  const rangeInvalid = useMemo(() => {
    if (!startDate || !dueDate) return false;
    return startDate.getTime() > dueDate.getTime();
  }, [startDate, dueDate]);

  const canSubmit = !submitting && title.trim().length > 0 && !rangeInvalid;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        start_at: startDate ? toUnix(startDate) : null,
        due_at: dueDate ? toUnix(dueDate) : null,
        reminder_offset:
          hasDueAt && reminder !== 'none' ? (reminder as number) : null,
        subtask_titles: isEdit ? [] : draftSubtaskTitles,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function performDelete() {
    if (!onDelete) return;
    await onDelete();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '編輯任務' : '新增任務'}
      description="標題輸入「明天下午 3 點」等會自動識別時間"
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* --- Basic --- */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="task-title">
              標題 <span className="text-destructive">*</span>
            </label>
            <Input
              id="task-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：明天下午 3 點和 John 開會"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="task-desc">
              備註
            </label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="補充細節（選填）"
            />
          </div>
        </div>

        <SubtaskList
          taskId={isEdit ? task?.id : null}
          draftTitles={draftSubtaskTitles}
          onDraftTitlesChange={setDraftSubtaskTitles}
          onProgressChange={onSubtaskProgressChange}
        />

        {/* --- Schedule --- */}
        <section className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3.5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CalendarClock className="h-4 w-4 text-muted-foreground" strokeWidth={2.2} />
            排程
            <span className="ml-auto text-[11px] font-normal text-muted-foreground">
              開始、截止皆可留空
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[12px] text-muted-foreground" htmlFor="task-start">
                開始時間
              </label>
              <DateTimePicker
                id="task-start"
                value={startDate}
                onChange={setStartDate}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] text-muted-foreground" htmlFor="task-due">
                截止時間
              </label>
              <DateTimePicker
                id="task-due"
                value={dueDate}
                onChange={setDueDate}
                invalid={rangeInvalid}
              />
            </div>
          </div>

          {rangeInvalid && (
            <p className="text-[12px] text-destructive">
              截止時間不能早於開始時間。
            </p>
          )}

          <div className="space-y-1">
            <label className="text-[12px] text-muted-foreground" htmlFor="task-priority">
              <Flag className="mr-1 inline h-3 w-3" strokeWidth={2.2} />
              優先級
            </label>
            <Select
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value) as Priority)}
            >
              {(Object.values(PRIORITY) as Priority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </Select>
          </div>
        </section>

        {/* --- Reminder --- */}
        <section
          className={cn(
            'space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3.5',
            !hasDueAt && 'opacity-60'
          )}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {reminder === 'none' ? (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Bell className="h-4 w-4 text-primary" />
            )}
            提醒
            {!hasDueAt && (
              <span className="ml-auto text-[11px] font-normal text-muted-foreground">
                需先設定截止時間
              </span>
            )}
          </div>
          <Select
            value={reminder}
            disabled={!hasDueAt}
            onChange={(e) => {
              const v = e.target.value;
              setReminder(v === 'none' ? 'none' : (Number(v) as ReminderOffset));
            }}
          >
            {REMINDER_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </section>

        {/* --- Actions --- */}
        {confirmingDelete ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <Trash2 className="h-4 w-4" />
              <span>確定刪除此任務？此動作無法復原。</span>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmingDelete(false)}
              >
                取消
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={performDelete}
              >
                確認刪除
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-1">
            {isEdit && onDelete ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                刪除
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {submitting ? '保存中…' : isEdit ? '保存' : '新增'}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Dialog>
  );
}
