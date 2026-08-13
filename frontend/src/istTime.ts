/** Campus attendance timezone. Do not use the browser or server local zone. */
export const IST_TIME_ZONE = 'Asia/Kolkata';

function parseTimestamp(raw: string): Date | null {
  if (!raw || typeof raw !== 'string') return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function istParts(date: Date): { year: string; month: string; day: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return { year: get('year'), month: get('month'), day: get('day') };
}

export function istDateKeyFromDate(date: Date): string {
  const { year, month, day } = istParts(date);
  return `${year}-${month}-${day}`;
}

export function istDateKeyFromRaw(raw: string): string | null {
  const parsed = parseTimestamp(raw);
  if (!parsed) return null;
  return istDateKeyFromDate(parsed);
}

export function isSameIstDay(raw: string, now: Date = new Date()): boolean {
  const key = istDateKeyFromRaw(raw);
  if (!key) return false;
  return key === istDateKeyFromDate(now);
}

export function formatIstDate(raw: string): string {
  const parsed = parseTimestamp(raw);
  if (!parsed) return raw || '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function formatIstTime(raw: string): string {
  const parsed = parseTimestamp(raw);
  if (!parsed) return '—';
  const text = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(parsed);
  return text.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
}

export interface IstDayAttendance {
  dateKey: string;
  dateLabel: string;
  firstTimestamp: string;
}

export function groupAttendanceByIstDay(
  entries: { timestamp: string }[]
): IstDayAttendance[] {
  const firstByDay = new Map<string, string>();
  for (const entry of entries) {
    const key = istDateKeyFromRaw(entry.timestamp);
    if (!key) continue;
    const existing = firstByDay.get(key);
    if (!existing || entry.timestamp < existing) {
      firstByDay.set(key, entry.timestamp);
    }
  }

  return [...firstByDay.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dateKey, firstTimestamp]) => ({
      dateKey,
      dateLabel: formatIstDate(firstTimestamp),
      firstTimestamp,
    }));
}
