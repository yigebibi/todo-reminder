import { useEffect, useState, type ReactNode } from 'react';
import { Moon, Sun, Info, Globe2, Tag, Trash2, Plus } from 'lucide-react';
import { Dialog } from './ui/Dialog';
import { Switch } from './ui/Switch';
import { Select } from './ui/Select';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { TagChip } from './TagChip';
import { useSettingsStore, type Region, type Theme } from '../stores/settingsStore';
import { getAutostartEnabled, setAutostartEnabled } from '../api/autostart';
import * as tagsApi from '../api/tags';
import type { Tag as TagModel } from '../types/models';
import { toast } from '../stores/toastStore';
import { REGION_LABELS, detectDefaultRegion } from '../lib/lunar';
import { cn } from '../lib/utils';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const region = useSettingsStore((s) => s.region);
  const setRegion = useSettingsStore((s) => s.setRegion);

  const [autostart, setAutostart] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<TagModel[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6B7280');

  useEffect(() => {
    if (!open) return;
    setError(null);
    getAutostartEnabled().then(setAutostart);
    setTagsLoading(true);
    tagsApi
      .listTags()
      .then(setTags)
      .finally(() => setTagsLoading(false));
  }, [open]);

  async function toggleAutostart(next: boolean) {
    setSaving(true);
    setError(null);
    try {
      await setAutostartEnabled(next);
      setAutostart(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function reloadTags() {
    const list = await tagsApi.listTags();
    setTags(list);
  }

  async function handleCreateTag() {
    const name = newTagName.trim();
    if (!name) return;
    try {
      await tagsApi.createTag(name, newTagColor);
      setNewTagName('');
      setNewTagColor('#6B7280');
      await reloadTags();
      toast.success('標籤已新增');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDeleteTag(id: number) {
    try {
      await tagsApi.deleteTag(id);
      await reloadTags();
      toast.success('標籤已刪除');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleColorChange(id: number, color: string) {
    try {
      await tagsApi.updateTagColor(id, color);
      setTags((prev) => prev.map((t) => (t.id === id ? { ...t, color } : t)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="設定">
      <div className="space-y-5">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">主題</h3>
          <div className="flex gap-2">
            <ThemeButton
              current={theme}
              value="light"
              onClick={setTheme}
              icon={<Sun className="h-3.5 w-3.5" />}
              label="亮色"
            />
            <ThemeButton
              current={theme}
              value="dark"
              onClick={setTheme}
              icon={<Moon className="h-3.5 w-3.5" />}
              label="暗色"
            />
          </div>
        </section>

        <section className="space-y-2 border-t border-border/50 pt-4">
          <div className="flex items-center gap-2">
            <Globe2 className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.2} />
            <h3 className="text-sm font-semibold">月曆區域 / 節假日</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            決定農曆旁顯示的節日內容。「跟隨系統」會依你作業系統的地區自動選（目前偵測為{' '}
            <span className="font-medium text-foreground">{REGION_LABELS[detectDefaultRegion()]}</span>
            ）。
          </p>
          <Select
            value={region}
            onChange={(e) => setRegion(e.target.value as Region)}
          >
            {(Object.keys(REGION_LABELS) as Region[]).map((r) => (
              <option key={r} value={r}>
                {REGION_LABELS[r]}
              </option>
            ))}
          </Select>
        </section>

        <section className="space-y-3 border-t border-border/50 pt-4">
          <div className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.2} />
            <h3 className="text-sm font-semibold">標籤管理</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            在此新增或調整標籤顏色。任務表單中可為任務指派標籤。
          </p>

          {tagsLoading ? (
            <p className="text-xs text-muted-foreground">載入標籤…</p>
          ) : tags.length === 0 ? (
            <p className="text-xs text-muted-foreground">尚無標籤。</p>
          ) : (
            <ul className="space-y-2">
              {tags.map((tag) => (
                <li
                  key={tag.id}
                  className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/20 px-2 py-1.5"
                >
                  <TagChip tag={tag} className="max-w-[100px]" />
                  <input
                    type="color"
                    value={tag.color}
                    onChange={(e) => void handleColorChange(tag.id, e.target.value)}
                    className="h-7 w-9 shrink-0 cursor-pointer rounded border border-border/60 bg-background p-0.5"
                    aria-label={`${tag.name} 顏色`}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {tag.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => void handleDeleteTag(tag.id)}
                    aria-label={`刪除 ${tag.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleCreateTag();
                }
              }}
              placeholder="新標籤名稱"
              className="h-8 flex-1 text-sm"
            />
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              className="h-8 w-10 shrink-0 cursor-pointer rounded border border-border/60 bg-background p-0.5"
              aria-label="新標籤顏色"
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

        <section className="flex items-start justify-between gap-4 border-t border-border/50 pt-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">開機自啟</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              登入 Windows 後自動在後台啟動，不用記得手動開。
            </p>
            {error && (
              <p className="mt-1 text-xs text-destructive">切換失敗：{error}</p>
            )}
          </div>
          <Switch
            checked={autostart ?? false}
            onCheckedChange={toggleAutostart}
            disabled={autostart === null || saving}
            aria-label="開機自啟"
          />
        </section>

        <section className="flex gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            按視窗右上角的 ✕ 會隱藏到系統托盤，提醒仍會照常彈出。要真正退出，請右鍵托盤 icon 選「退出」。
          </span>
        </section>
      </div>
    </Dialog>
  );
}

function ThemeButton({
  current,
  value,
  onClick,
  icon,
  label,
}: {
  current: Theme;
  value: Theme;
  onClick: (v: Theme) => void;
  icon: ReactNode;
  label: string;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={cn(
        'inline-flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
        active
          ? 'border-primary bg-primary/10 text-foreground'
          : 'border-border/70 text-muted-foreground hover:border-border hover:text-foreground'
      )}
    >
      {icon}
      {label}
    </button>
  );
}
