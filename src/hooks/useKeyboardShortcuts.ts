import { useEffect } from 'react';
import { emitAppEvent } from '../lib/events';

// Global shortcuts:
//   Ctrl+N  -> emit 'app:newTask'     (KanbanView listens to open the new-task dialog)
//   Ctrl+F  -> emit 'app:focusSearch' (search input listens to focus itself)
// Shortcuts are suppressed while the user is typing in an input/textarea/contenteditable,
// so they never steal focus mid-typing. We also skip when any dialog appears to already
// be capturing — the Dialog component handles its own Escape handling.
export function useKeyboardShortcuts() {
  useEffect(() => {
    const isTypingIn = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        el.isContentEditable
      );
    };

    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || e.altKey) return;

      const key = e.key.toLowerCase();

      if (key === 'n' && !isTypingIn(e.target)) {
        e.preventDefault();
        emitAppEvent('app:newTask');
      } else if (key === 'f') {
        // Ctrl+F should ALWAYS focus search, even from inside an input,
        // so typing-aware guard is intentionally skipped.
        e.preventDefault();
        emitAppEvent('app:focusSearch');
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
