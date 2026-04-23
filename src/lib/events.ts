// Lightweight app-level event bus via window CustomEvent.
// Kept small + typed so UI shortcuts and menu commands don't need shared state.

export type AppEvent =
  | 'app:newTask'      // open the task creation dialog
  | 'app:focusSearch'; // move focus into the search input

export function emitAppEvent(name: AppEvent) {
  window.dispatchEvent(new CustomEvent(name));
}

export function onAppEvent(name: AppEvent, handler: () => void): () => void {
  const h = () => handler();
  window.addEventListener(name, h);
  return () => window.removeEventListener(name, h);
}
