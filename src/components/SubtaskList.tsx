import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ListChecks, Plus, Trash2 } from 'lucide-react';
import * as subtasksApi from '../api/subtasks';
import type { Subtask } from '../types/models';
import { Checkbox } from './ui/Checkbox';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

interface SubtaskListProps {
  taskId?: number | null;
  draftTitles?: string[];
  onDraftTitlesChange?: (titles: string[]) => void;
  onProgressChange?: () => void;
}

export function SubtaskList({
  taskId,
  draftTitles = [],
  onDraftTitlesChange,
  onProgressChange,
}: SubtaskListProps) {
  const isDraft = taskId == null;
  const [items, setItems] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const loadItems = useCallback(async () => {
    if (taskId == null) return;
    setLoading(true);
    try {
      const rows = await subtasksApi.listSubtasks(taskId);
      setItems(rows);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId != null) {
      void loadItems();
    } else {
      setItems([]);
    }
  }, [taskId, loadItems]);

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;

    if (isDraft) {
      onDraftTitlesChange?.([...draftTitles, title]);
      setNewTitle('');
      return;
    }

    await subtasksApi.createSubtask(taskId!, title);
    setNewTitle('');
    await loadItems();
    onProgressChange?.();
  }

  async function handleToggle(subtask: Subtask) {
    const next = subtask.done === 0;
    await subtasksApi.toggleSubtask(subtask.id, next);
    await loadItems();
    onProgressChange?.();
  }

  async function handleRename(subtask: Subtask, title: string) {
    const trimmed = title.trim();
    if (!trimmed || trimmed === subtask.title) return;
    await subtasksApi.renameSubtask(subtask.id, trimmed);
    await loadItems();
  }

  async function handleDelete(subtask: Subtask) {
    await subtasksApi.deleteSubtask(subtask.id);
    await loadItems();
    onProgressChange?.();
  }

  function handleDeleteDraft(index: number) {
    onDraftTitlesChange?.(draftTitles.filter((_, i) => i !== index));
  }

  async function handleMove(subtask: Subtask, direction: 'up' | 'down') {
    await subtasksApi.moveSubtask(subtask.id, direction);
    await loadItems();
  }

  const doneCount = isDraft ? 0 : items.filter((s) => s.done === 1).length;
  const totalCount = isDraft ? draftTitles.length : items.length;

  return (
    <section className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3.5">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ListChecks className="h-4 w-4 text-muted-foreground" strokeWidth={2.2} />
        子任務
        {totalCount > 0 && (
          <span className="ml-auto text-[11px] font-normal text-muted-foreground">
            {isDraft ? `${totalCount} 項` : `${doneCount}/${totalCount}`}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {isDraft
          ? draftTitles.map((title, index) => (
              <div
                key={`draft-${index}-${title}`}
                className="flex items-center gap-2 rounded-md border border-border/50 bg-background/60 px-2 py-1.5"
              >
                <span className="flex-1 truncate text-[13px]">{title}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteDraft(index)}
                  aria-label="刪除子任務"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          : items.map((subtask, index) => (
              <div
                key={subtask.id}
                className="group flex items-center gap-1.5 rounded-md border border-border/50 bg-background/60 px-2 py-1"
              >
                <Checkbox
                  checked={subtask.done === 1}
                  onChange={() => void handleToggle(subtask)}
                  aria-label={subtask.done === 1 ? '標記為未完成' : '標記為完成'}
                />
                <Input
                  value={subtask.title}
                  onChange={(e) => {
                    const v = e.target.value;
                    setItems((prev) =>
                      prev.map((s) => (s.id === subtask.id ? { ...s, title: v } : s))
                    );
                  }}
                  onBlur={(e) => void handleRename(subtask, e.target.value)}
                  className={cn(
                    'h-8 flex-1 border-0 bg-transparent px-1 text-[13px] shadow-none focus-visible:ring-0',
                    subtask.done === 1 && 'text-muted-foreground line-through'
                  )}
                />
                <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={index === 0}
                    onClick={() => void handleMove(subtask, 'up')}
                    aria-label="上移"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={index === items.length - 1}
                    onClick={() => void handleMove(subtask, 'down')}
                    aria-label="下移"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => void handleDelete(subtask)}
                    aria-label="刪除子任務"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}

        {loading && !isDraft && items.length === 0 && (
          <p className="text-[12px] text-muted-foreground">載入子任務…</p>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleAdd();
            }
          }}
          placeholder="新增子任務…"
          className="h-8 text-[13px]"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => void handleAdd()}
          disabled={!newTitle.trim()}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </section>
  );
}
