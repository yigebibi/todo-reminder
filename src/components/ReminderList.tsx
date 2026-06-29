import { Bell, BellOff, Plus, Trash2 } from 'lucide-react';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

export const REMINDER_OFFSET_OPTIONS: { value: number; label: string }[] = [
  { value: 5, label: '提前 5 分鐘' },
  { value: 15, label: '提前 15 分鐘' },
  { value: 60, label: '提前 1 小時' },
  { value: 1440, label: '提前 1 天' },
];

export function offsetLabel(minutes: number): string {
  return REMINDER_OFFSET_OPTIONS.find((p) => p.value === minutes)?.label ?? `提前 ${minutes} 分鐘`;
}

interface ReminderListProps {
  offsets: number[];
  onChange: (offsets: number[]) => void;
  disabled?: boolean;
}

export function ReminderList({ offsets, onChange, disabled }: ReminderListProps) {
  const used = new Set(offsets);
  const available = REMINDER_OFFSET_OPTIONS.filter((p) => !used.has(p.value));
  const canAdd = !disabled && available.length > 0;

  function addReminder() {
    if (!canAdd) return;
    onChange([...offsets, available[0].value].sort((a, b) => b - a));
  }

  function updateOffset(index: number, next: number) {
    if (offsets.includes(next) && offsets[index] !== next) return;
    const nextOffsets = [...offsets];
    nextOffsets[index] = next;
    onChange(nextOffsets.sort((a, b) => b - a));
  }

  function removeOffset(index: number) {
    onChange(offsets.filter((_, i) => i !== index));
  }

  return (
    <section
      className={cn(
        'space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3.5',
        disabled && 'opacity-60'
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {offsets.length === 0 ? (
          <BellOff className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Bell className="h-4 w-4 text-primary" />
        )}
        提醒
        {offsets.length > 0 && (
          <span className="ml-auto text-[11px] font-normal text-muted-foreground">
            {offsets.length} 條
          </span>
        )}
        {disabled && (
          <span className="ml-auto text-[11px] font-normal text-muted-foreground">
            需先設定截止時間
          </span>
        )}
      </div>

      {offsets.length > 0 && (
        <ul className="space-y-1.5">
          {offsets.map((offset, index) => (
            <li key={`${offset}-${index}`} className="flex items-center gap-2">
              <Select
                value={offset}
                disabled={disabled}
                onChange={(e) => updateOffset(index, Number(e.target.value))}
                className="h-8 flex-1 text-[13px]"
              >
                {REMINDER_OFFSET_OPTIONS.map((p) => (
                  <option
                    key={p.value}
                    value={p.value}
                    disabled={used.has(p.value) && p.value !== offset}
                  >
                    {p.label}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                disabled={disabled}
                onClick={() => removeOffset(index)}
                aria-label="刪除提醒"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {offsets.length === 0 && !disabled && (
        <p className="text-[12px] text-muted-foreground">尚未設定提醒，可新增多條。</p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={!canAdd}
        onClick={addReminder}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        新增提醒
      </Button>
    </section>
  );
}
