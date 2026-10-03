// Small pure time helpers used by the `link` commands (kept here so they can be unit-tested).

/** start + minutes, written with the same UTC offset as `start` (so start/end read alike). */
export function plusMinutes(startIso: string, minutes: number): string {
  const ms = Date.parse(startIso) + minutes * 60_000;
  const offset = startIso.match(/([+-])(\d{2}):(\d{2})$/);
  if (!offset) return new Date(ms).toISOString();
  const sign = offset[1] === '-' ? -1 : 1;
  const offsetMs = sign * (Number(offset[2]) * 60 + Number(offset[3])) * 60_000;
  return new Date(ms + offsetMs).toISOString().slice(0, 23) + offset[0];
}

/** Offset of `timeZone` from UTC at instant `ms`, in ms (Toronto in October: -4h). */
export function tzOffsetMs(ms: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** The UTC instant at which day `ymd` (YYYY-MM-DD) begins in `timeZone`. */
export function zonedDayStart(ymd: string, timeZone: string): Date {
  const guess = Date.parse(`${ymd}T00:00:00Z`);
  // Second pass uses the offset at the first answer, which settles days that change DST.
  const first = guess - tzOffsetMs(guess, timeZone);
  return new Date(guess - tzOffsetMs(first, timeZone));
}

/** Today's date (YYYY-MM-DD) in `timeZone`. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export interface DaySlot {
  start: string; // ISO
  date: string; // e.g. "2026-10-03 Sat" (already in the display timezone)
  time: string; // e.g. "12:00"
}

/**
 * Collapse slot START times into readable ranges per day, e.g.
 * { "2026-10-03 Sat": ["12:00–13:00", "14:00–22:30"] }. Two slots join a range when
 * they are exactly one step apart; the step is the smallest gap seen between
 * consecutive slots on a day (falls back to `fallbackStepMinutes`).
 * Ranges list start times: "12:00–22:30" means a meeting can START from 12:00 to 22:30.
 */
export function startsByDay(slots: DaySlot[], fallbackStepMinutes: number): Record<string, string[]> {
  const byDay = new Map<string, DaySlot[]>();
  for (const slot of slots) {
    const list = byDay.get(slot.date) ?? [];
    list.push(slot);
    byDay.set(slot.date, list);
  }

  let step = Infinity;
  for (const list of byDay.values()) {
    const sorted = [...list].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    for (let i = 1; i < sorted.length; i++) {
      const gap = Date.parse(sorted[i].start) - Date.parse(sorted[i - 1].start);
      if (gap > 0 && gap < step) step = gap;
    }
  }
  if (!Number.isFinite(step)) step = fallbackStepMinutes * 60_000;

  const out: Record<string, string[]> = {};
  for (const [date, list] of byDay) {
    const sorted = [...list].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    const ranges: string[] = [];
    let first = sorted[0];
    let prev = sorted[0];
    for (let i = 1; i <= sorted.length; i++) {
      const cur = sorted[i];
      if (cur && Date.parse(cur.start) - Date.parse(prev.start) === step) {
        prev = cur;
        continue;
      }
      ranges.push(first.time === prev.time ? first.time : `${first.time}–${prev.time}`);
      if (cur) {
        first = cur;
        prev = cur;
      }
    }
    out[date] = ranges;
  }
  return out;
}
