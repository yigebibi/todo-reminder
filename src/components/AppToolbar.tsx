import { useEffect, useRef, useState } from 'react';
import { Plus, Sparkles, Search, X } from 'lucide-react';
import * as chrono from 'chrono-node';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useTaskStore } from '../stores/taskStore';
import { useUIStore } from '../stores/uiStore';
import { toast } from '../stores/toastStore';
import { emitAppEvent, onAppEvent } from '../lib/events';
import { toUnix } from '../lib/datetime';

export function AppToolbar() {
  const add = useTaskStore((s) => s.add);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);

  const [quickTitle, setQuickTitle] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return onAppEvent('app:focusSearch', () => {
      const el = searchInputRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    });
  }, []);

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    try {
      const parsed = chrono.parseDate(title, new Date(), { forwardDate: true });
      await add({ title, due_at: parsed ? toUnix(parsed) : null });
      setQuickTitle('');
      toast.success('任務已新增');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="flex items-center gap-2 border-b border-border/60 bg-background/70 px-6 py-2 backdrop-blur-sm">
      <form onSubmit={handleQuickAdd} className="flex flex-1 gap-2">
        <div className="relative flex-1">
          <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary/70" />
          <Input
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder='輸入任務與時間，如：「明天下午 3 點跟 Kevin 開會」'
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={!quickTitle.trim()}>
          <Plus className="mr-1 h-4 w-4" />
          新增
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => emitAppEvent('app:newTask')}
          title="Ctrl+N"
        >
          進階
        </Button>
      </form>

      <div className="relative w-[240px] shrink-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜尋 ⌃F"
          className="pl-9 pr-8"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="清除搜尋"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
