import { create } from 'zustand';
import {
  detectLocationByIP,
  fetchForecast,
  type DailyWeather,
  type WeatherLocation,
} from '../lib/weather';

const REFRESH_MS = 60 * 60 * 1000; // 1 hour

interface WeatherState {
  forecast: Map<string, DailyWeather>;
  location: WeatherLocation | null;
  loading: boolean;
  lastLoadedAt: number;
  error: string | null;

  load: (force?: boolean) => Promise<void>;
  getForDate: (yyyymmdd: string) => DailyWeather | undefined;
}

export const useWeatherStore = create<WeatherState>((set, get) => ({
  forecast: new Map(),
  location: null,
  loading: false,
  lastLoadedAt: 0,
  error: null,

  load: async (force = false) => {
    const now = Date.now();
    const state = get();
    if (!force && state.forecast.size > 0 && now - state.lastLoadedAt < REFRESH_MS) return;
    if (state.loading) return;

    set({ loading: true, error: null });
    try {
      const location = state.location ?? (await detectLocationByIP());
      const days = await fetchForecast(location, 14);
      const map = new Map<string, DailyWeather>();
      for (const d of days) map.set(d.date, d);
      set({ forecast: map, location, lastLoadedAt: now, loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false });
    }
  },

  getForDate: (yyyymmdd) => get().forecast.get(yyyymmdd),
}));
