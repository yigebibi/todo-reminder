// Weather integration using Open-Meteo (free, no key, no signup).
// Location resolved via IP geolocation when user hasn't set anything explicit.

import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon,
} from 'lucide-react';

export interface DailyWeather {
  /** "YYYY-MM-DD" in local time of the location */
  date: string;
  code: number;
  high: number; // °C
  low: number;  // °C
}

export interface WeatherLocation {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

// ---- Location (IP-based, free) ----
// Uses ipapi.co which returns JSON including latitude/longitude/city.
// No API key required, CORS-enabled. Fallback to Taipei if it fails.
export async function detectLocationByIP(): Promise<WeatherLocation> {
  const fallback: WeatherLocation = {
    latitude: 25.038,
    longitude: 121.565,
    city: 'Taipei',
    country: 'TW',
  };
  try {
    const r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return fallback;
    const j = await r.json();
    if (typeof j.latitude !== 'number' || typeof j.longitude !== 'number') return fallback;
    return {
      latitude: j.latitude,
      longitude: j.longitude,
      city: j.city,
      country: j.country_code,
    };
  } catch {
    return fallback;
  }
}

// ---- Forecast (Open-Meteo) ----
export async function fetchForecast(
  loc: WeatherLocation,
  days = 14
): Promise<DailyWeather[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${loc.latitude}&longitude=${loc.longitude}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&timezone=auto&forecast_days=${days}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`Open-Meteo ${r.status}`);
  const j = await r.json();
  const d = j.daily;
  if (!d?.time) return [];
  const out: DailyWeather[] = [];
  for (let i = 0; i < d.time.length; i++) {
    out.push({
      date: d.time[i],
      code: d.weather_code[i],
      high: Math.round(d.temperature_2m_max[i]),
      low: Math.round(d.temperature_2m_min[i]),
    });
  }
  return out;
}

// ---- WMO weather code → Lucide icon + short label ----
// WMO codes: https://open-meteo.com/en/docs#api-documentation
export interface WeatherDisplay {
  Icon: LucideIcon;
  label: string;
  tone: 'sunny' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog';
}

export function describeWeather(code: number): WeatherDisplay {
  if (code === 0) return { Icon: Sun, label: '晴', tone: 'sunny' };
  if (code === 1 || code === 2) return { Icon: CloudSun, label: '多雲', tone: 'cloudy' };
  if (code === 3) return { Icon: Cloud, label: '陰', tone: 'cloudy' };
  if (code === 45 || code === 48) return { Icon: CloudFog, label: '霧', tone: 'fog' };
  if (code >= 51 && code <= 57) return { Icon: CloudDrizzle, label: '毛毛雨', tone: 'rain' };
  if (code >= 61 && code <= 67) return { Icon: CloudRain, label: '雨', tone: 'rain' };
  if (code >= 71 && code <= 77) return { Icon: CloudSnow, label: '雪', tone: 'snow' };
  if (code >= 80 && code <= 82) return { Icon: CloudRain, label: '陣雨', tone: 'rain' };
  if (code === 85 || code === 86) return { Icon: CloudSnow, label: '陣雪', tone: 'snow' };
  if (code >= 95) return { Icon: CloudLightning, label: '雷雨', tone: 'storm' };
  return { Icon: Cloud, label: '—', tone: 'cloudy' };
}

export const WEATHER_TONE_CLASS: Record<WeatherDisplay['tone'], string> = {
  sunny: 'text-[hsl(35_95%_55%)]',
  cloudy: 'text-muted-foreground',
  rain: 'text-[hsl(210_80%_55%)]',
  snow: 'text-[hsl(199_60%_68%)]',
  storm: 'text-[hsl(268_60%_58%)]',
  fog: 'text-muted-foreground/80',
};
