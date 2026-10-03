import type { CalcomClient } from './client.js';

export interface BusyBlock {
  start: string;
  end: string;
}

export interface MyBusyResult {
  checked: boolean;
  reason?: string;
  calendars: string[];
  busy: BusyBlock[];
}

/**
 * Busy blocks from the calendars Cal.com itself uses for conflict checking
 * (the ones marked `isSelected`; the primary calendar if none are).
 *
 * The real endpoint is `/calendars/busy-times` and it needs every calendar
 * spelled out as `calendarsToLoad[i][credentialId|externalId]`.
 */
export async function myBusyTimes(
  client: CalcomClient,
  dateFrom: string,
  dateTo: string,
  timeZone: string,
  opts: { credentialId?: number } = {},
): Promise<MyBusyResult> {
  if (!client.authenticated) {
    return {
      checked: false,
      reason: 'No API key, so your own calendar was not checked. Run `calcom login`.',
      calendars: [],
      busy: [],
    };
  }

  const res: any = await client.get('/calendars');
  const connected: any[] = res?.data?.connectedCalendars ?? [];
  const toLoad: Array<{ credentialId: number; externalId: string }> = [];
  for (const conn of connected) {
    if (opts.credentialId && conn.credentialId !== opts.credentialId) continue;
    const calendars: any[] = conn.calendars ?? [];
    const selected = calendars.filter((c) => c.isSelected);
    const chosen = selected.length > 0 ? selected : calendars.filter((c) => c.primary);
    for (const cal of chosen) {
      toLoad.push({ credentialId: cal.credentialId ?? conn.credentialId, externalId: cal.externalId });
    }
  }
  if (toLoad.length === 0) {
    return { checked: false, reason: 'No connected calendars to check.', calendars: [], busy: [] };
  }

  const query: Record<string, unknown> = { loggedInUsersTz: timeZone, dateFrom, dateTo };
  toLoad.forEach((cal, i) => {
    query[`calendarsToLoad[${i}][credentialId]`] = cal.credentialId;
    query[`calendarsToLoad[${i}][externalId]`] = cal.externalId;
  });
  const busy: any = await client.get('/calendars/busy-times', query);
  const blocks: BusyBlock[] = (busy?.data ?? []).map((b: any) => ({ start: b.start, end: b.end }));
  return { checked: true, calendars: toLoad.map((c) => c.externalId), busy: blocks };
}

/** True when [start, start + minutes) overlaps any busy block. */
export function overlapsBusy(startIso: string, minutes: number, busy: BusyBlock[]): boolean {
  const s = Date.parse(startIso);
  const e = s + minutes * 60_000;
  return busy.some((b) => Date.parse(b.start) < e && Date.parse(b.end) > s);
}
