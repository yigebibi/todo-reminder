import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';
export type Region = 'auto' | 'tw' | 'cn' | 'hk';

interface SettingsState {
  theme: Theme;
  region: Region;
  setTheme: (t: Theme) => void;
  setRegion: (r: Region) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      region: 'auto',
      setTheme: (t) => set({ theme: t }),
      setRegion: (r) => set({ region: r }),
    }),
    { name: 'todo-reminder-settings' }
  )
);
