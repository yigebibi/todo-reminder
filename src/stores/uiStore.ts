import { create } from 'zustand';

export type ViewMode = 'kanban' | 'calendar';

interface UIState {
  viewMode: ViewMode;
  searchQuery: string;
  setViewMode: (m: ViewMode) => void;
  setSearchQuery: (q: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  viewMode: 'kanban',
  searchQuery: '',
  setViewMode: (m) => set({ viewMode: m }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}));
