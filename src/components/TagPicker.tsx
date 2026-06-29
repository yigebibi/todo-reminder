import { useCallback, useEffect, useState } from 'react';
import { Plus, Tag } from 'lucide-react';
import * as tagsApi from '../api/tags';
import type { Tag as TagModel } from '../types/models';
import { TagChip } from './TagChip';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

const DEFAULT_NEW_TAG_COLOR = '#6B7280';

interface TagPickerProps {
  taskId?: number | null;
  draftTagIds?: number[];
  onDraftTagIdsChange?: (ids: number[]) => void;
  onTagsChange?: () => void;
}

export function TagPicker({
  taskId,
  draftTagIds = [],
  onDraftTagIdsChange,
  onTagsChange,
}: TagPickerProps) {
  const isDraft = taskId == null;
  const [allTags, setAllTags] = useState<TagModel[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_NEW_TAG_COLOR);

  const loadAllTags = useCallback(async () => {
    const tags = await tagsApi.listTags();
    setAllTags(tags);
    return tags;
  }, []);

  const loadSelected = useCallback(async () => {
    if (taskId == null) return;
    setLoading(true);
    try {
      const tags = await tagsApi.getTaskTags(taskId);
      setSelectedIds(tags.map((t) => t.id));
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void loadAllTags();
  }, [loadAllTags]);

  useEffect(() => {
    if (taskId != null) {
      void loadSelected();
    } else {
      setSelectedIds(draftTagIds);
    }
  }, [taskId, draftTagIds, loadSelected]);

  const selectedTags = allTags.filter((t) => selectedIds.includes(t.id));
  const unselectedTags = allTags.filter((t) => !selectedIds.includes(t.id));

  async function toggleTag(tag: TagModel) {
    const isSelected = selectedIds.includes(tag.id);

    if (isDraft) {
      const next = isSelected
        ? selectedIds.filter((id) => id !== tag.id)
        : [...selectedIds, tag.id];
      setSelectedIds(next);
      onDraftTagIdsChange?.(next);
      return;
    }

    if (isSelected) {
      await tagsApi.unassignTag(taskId!, tag.id);
      setSelectedIds((prev) => prev.filter((id) => id !== tag.id));
    } else {
      await tagsApi.assignTag(taskId!, tag.id);
      setSelectedIds((prev) => [...prev, tag.id]);
    }
    onTagsChange?.();
  }

  async function handleCreateTag() {
    const name = newTagName.trim();
    if (!name) return;

    await tagsApi.createTag(name, newTagColor);
    const tags = await loadAllTags();
    const created = tags.find((t) => t.name === name);
    setNewTagName('');
    setNewTagColor(DEFAULT_NEW_TAG_COLOR);

    if (created) {
      if (isDraft) {
        const next = [...selectedIds, created.id];
        setSelectedIds(next);
        onDraftTagIdsChange?.(next);
      } else {
        await tagsApi.assignTag(taskId!, created.id);
        setSelectedIds((prev) => [...prev, created.id]);
        onTagsChange?.();
      }
    }
  }

  return (
    <section className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3.5">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Tag className="h-4 w-4 text-muted-foreground" strokeWidth={2.2} />
        標籤
        {selectedTags.length > 0 && (
          <span className="ml-auto text-[11px] font-normal text-muted-foreground">
            已選 {selectedTags.length}
          </span>
        )}
      </div>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => void toggleTag(tag)}
              className="rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              title="點擊移除"
            >
              <TagChip tag={tag} />
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-[12px] text-muted-foreground">載入標籤…</p>
      ) : unselectedTags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {unselectedTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => void toggleTag(tag)}
              className={cn(
                'rounded-md border border-dashed border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground',
                'transition-colors hover:border-border hover:bg-background/60 hover:text-foreground'
              )}
            >
              + {tag.name}
            </button>
          ))}
        </div>
      ) : allTags.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">尚無標籤，可在下方新增。</p>
      ) : null}

      <div className="flex gap-2 pt-1">
        <Input
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleCreateTag();
            }
          }}
          placeholder="新建標籤…"
          className="h-8 flex-1 text-[13px]"
        />
        <input
          type="color"
          value={newTagColor}
          onChange={(e) => setNewTagColor(e.target.value)}
          className="h-8 w-10 shrink-0 cursor-pointer rounded border border-border/60 bg-background p-0.5"
          title="標籤顏色"
          aria-label="標籤顏色"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => void handleCreateTag()}
          disabled={!newTagName.trim()}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </section>
  );
}
