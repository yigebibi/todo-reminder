import { Solar, HolidayUtil } from 'lunar-typescript';
import type { Region } from '../stores/settingsStore';

export type ResolvedRegion = 'tw' | 'cn' | 'hk';

export interface LunarCellInfo {
  /** Short label to show next to the Gregorian day number. */
  label: string;
  /** Classification for color styling. */
  kind: 'holiday' | 'jieqi' | 'month' | 'day';
  /** Set when the day is a legal public holiday — calendar cells can highlight. */
  holiday: boolean;
}

// lunar-typescript returns jieqi in simplified Chinese (谷雨, 惊蛰, 处暑, 小满, 芒种).
// Convert to traditional for TW/HK users so characters don't mix with the TC UI.
const JIEQI_S2T: Record<string, string> = {
  惊蛰: '驚蟄',
  谷雨: '穀雨',
  小满: '小滿',
  芒种: '芒種',
  处暑: '處暑',
};

// ---- Regional holiday tables ----
// Keys are zero-padded "MM-DD".
// Solar = Gregorian. Lunar = lunar month + day (NOT tied to Gregorian date).

const TW_SOLAR: Record<string, string> = {
  '01-01': '元旦',
  '02-28': '和平紀念日',
  '04-04': '兒童節',
  '04-05': '清明',
  '05-01': '勞動節',
  '10-10': '國慶日',
};

const TW_LUNAR: Record<string, string> = {
  '01-01': '春節',
  '01-02': '春節',
  '01-03': '春節',
  '05-05': '端午節',
  '08-15': '中秋節',
};

const HK_SOLAR: Record<string, string> = {
  '01-01': '元旦',
  '05-01': '勞動節',
  '07-01': '回歸紀念',
  '10-01': '國慶日',
  '12-25': '聖誕',
  '12-26': '節禮日',
};

const HK_LUNAR: Record<string, string> = {
  '01-01': '農曆年初一',
  '01-02': '農曆年初二',
  '01-03': '農曆年初三',
  '04-08': '佛誕',
  '05-05': '端午節',
  '08-15': '中秋',
  '09-09': '重陽',
};

// ---- Region detection ----

export function detectDefaultRegion(): ResolvedRegion {
  try {
    const opts = new Intl.DateTimeFormat().resolvedOptions();
    const locale = (opts.locale ?? '').toLowerCase();
    if (locale.includes('-hk') || locale.includes('_hk')) return 'hk';
    if (locale.includes('-tw') || locale.includes('_tw') || locale.includes('hant')) return 'tw';
    if (locale.includes('-cn') || locale.includes('hans')) return 'cn';
    const tz = opts.timeZone ?? '';
    if (tz === 'Asia/Taipei') return 'tw';
    if (tz === 'Asia/Hong_Kong' || tz === 'Asia/Macau') return 'hk';
    if (
      tz === 'Asia/Shanghai' ||
      tz === 'Asia/Chongqing' ||
      tz === 'Asia/Urumqi' ||
      tz === 'Asia/Harbin'
    ) {
      return 'cn';
    }
  } catch {
    // fall through
  }
  return 'tw';
}

export function resolveRegion(region: Region): ResolvedRegion {
  return region === 'auto' ? detectDefaultRegion() : region;
}

// ---- Main cell info ----

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function holidayForRegion(
  solarKey: string,
  lunarKey: string,
  region: ResolvedRegion,
  date: Date
): string | null {
  if (region === 'tw') return TW_SOLAR[solarKey] ?? TW_LUNAR[lunarKey] ?? null;
  if (region === 'hk') return HK_SOLAR[solarKey] ?? HK_LUNAR[lunarKey] ?? null;
  // cn: use lunar-typescript's mainland holiday data (covers adjusted workdays)
  const h = HolidayUtil.getHoliday(date.getFullYear(), date.getMonth() + 1, date.getDate());
  if (h && !h.isWork()) return h.getName();
  return null;
}

export function getLunarCellInfo(date: Date, region: Region): LunarCellInfo {
  const resolved = resolveRegion(region);
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();

  const solarKey = `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  const lunarKey = `${pad2(Math.abs(lunar.getMonth()))}-${pad2(lunar.getDay())}`;

  // 1. Holiday (highest priority)
  const holidayName = holidayForRegion(solarKey, lunarKey, resolved, date);
  if (holidayName) {
    return { label: holidayName, kind: 'holiday', holiday: true };
  }

  // 2. Jieqi (solar term) — if exactly on that day
  const jieqi = lunar.getJieQi();
  if (jieqi) {
    const label = resolved === 'cn' ? jieqi : JIEQI_S2T[jieqi] ?? jieqi;
    return { label, kind: 'jieqi', holiday: false };
  }

  // 3. Lunar month start — show month name
  if (lunar.getDay() === 1) {
    const monthCn = lunar.getMonthInChinese();
    const label = /月$/.test(monthCn) ? monthCn : `${monthCn}月`;
    return { label, kind: 'month', holiday: false };
  }

  // 4. Regular lunar day
  return { label: lunar.getDayInChinese(), kind: 'day', holiday: false };
}

export const REGION_LABELS: Record<Region, string> = {
  auto: '跟隨系統',
  tw: '台灣',
  cn: '中國大陸',
  hk: '香港',
};
