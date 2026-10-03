import { z } from 'zod';
import type { CalcomClient } from '../../core/client.js';
import { myBusyTimes, overlapsBusy } from '../../core/busy.js';
import { resolveCalLink, type ResolvedCalEvent } from '../../core/calLink.js';
import { AuthError, ValidationError } from '../../core/errors.js';
import { plusMinutes, startsByDay, todayIn, zonedDayStart } from '../../core/time.js';
import type { CommandDefinition } from '../../core/types.js';

// The `link` group is the attendee side of Cal.com: booking time on SOMEONE ELSE'S
// public link (cal.com/<user>/<slug>), the way their booking page would, while
// checking your own connected calendars for conflicts. Writes (book, cancel,
// reschedule) are dry runs unless --confirm is passed.

const DAY_MS = 86_400_000;

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  return ymd(new Date(Date.parse(`${dateStr}T00:00:00Z`) + days * DAY_MS));
}

function localParts(iso: string, timeZone: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(d);
  const get = (t: string) => date.find((p) => p.type === t)?.value ?? '';
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
  return { date: `${get('year')}-${get('month')}-${get('day')} ${get('weekday')}`, time };
}

async function myProfile(client: CalcomClient): Promise<any | null> {
  if (!client.authenticated) return null;
  const res: any = await client.get('/me').catch(() => null);
  return res?.data ?? null;
}

async function defaultTimeZone(client: CalcomClient, given?: string): Promise<string> {
  if (given) return given;
  const me = await myProfile(client);
  return me?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Open slot start times (ISO) for an event, via the public /slots endpoint. */
async function openSlots(
  client: CalcomClient,
  eventTypeId: number,
  start: string,
  end: string,
  timeZone: string,
): Promise<string[]> {
  const res: any = await client.anonymous().get('/slots', { eventTypeId, start, end, timeZone });
  const out: string[] = [];
  for (const slots of Object.values(res?.data ?? {})) {
    for (const s of slots as any[]) out.push(typeof s === 'string' ? s : s?.start);
  }
  return out.filter(Boolean);
}

function eventSummary(ev: ResolvedCalEvent) {
  return {
    url: ev.url,
    username: ev.username ?? ev.teamSlug,
    slug: ev.slug,
    eventTypeId: ev.eventTypeId,
    title: ev.title,
    lengthInMinutes: ev.lengthInMinutes,
    locations: ev.locations,
    ownerScheduleTimeZone: ev.ownerScheduleTimeZone,
  };
}

/** Try a public (attendee) call first; if Cal.com wants auth, retry with the API key. */
async function publicThenAuthed<T>(client: CalcomClient, call: (c: CalcomClient) => Promise<T>): Promise<T> {
  try {
    return await call(client.anonymous());
  } catch (err) {
    if (err instanceof AuthError && client.authenticated) return call(client);
    throw err;
  }
}

export const linkResolveCommand: CommandDefinition = {
  name: 'link_resolve',
  group: 'link',
  subcommand: 'resolve',
  description:
    "Resolve someone else's Cal.com booking link (cal.com/<user>/<slug>) to its event type: id, length, locations and the owner's schedule timezone",
  examples: ['calcom link resolve https://cal.com/someone/30min'],
  auth: 'optional',
  inputSchema: z.object({
    url: z.string().describe('Cal.com booking link, e.g. https://cal.com/someone/30min'),
  }),
  cliMappings: { args: [{ field: 'url', name: 'url', required: true }] },
  endpoint: { method: 'GET', path: '/event-types' },
  fieldMappings: {},
  handler: async (input, client) => eventSummary(await resolveCalLink(input.url, client)),
};

export const linkSlotsCommand: CommandDefinition = {
  name: 'link_slots',
  group: 'link',
  subcommand: 'slots',
  description:
    "Open slots on someone else's Cal.com link, with times that clash with your own connected calendars removed (mutual availability)",
  examples: [
    'calcom link slots https://cal.com/someone/30min',
    'calcom link slots https://cal.com/someone/30min --from 2026-10-05 --to 2026-10-09 --timezone America/Toronto',
  ],
  auth: 'optional',
  inputSchema: z.object({
    url: z.string().describe('Cal.com booking link'),
    from: z.string().optional().describe('First day, YYYY-MM-DD, a day in timeZone (default today)'),
    to: z.string().optional().describe('Last day, YYYY-MM-DD, inclusive (default from + 7 days)'),
    timeZone: z.string().optional().describe('Timezone for the results (default: your Cal.com profile timezone)'),
    all: z.boolean().optional().describe('Also list slots that clash with your calendar, marked conflict: true'),
    summary: z.boolean().optional().describe('Only the per-day ranges (startsByDay), without the slot-by-slot list'),
  }),
  cliMappings: {
    args: [{ field: 'url', name: 'url', required: true }],
    options: [
      { field: 'from', flags: '--from <date>', description: 'First day YYYY-MM-DD in --timezone (default today)' },
      { field: 'to', flags: '--to <date>', description: 'Last day YYYY-MM-DD, inclusive (default from + 7 days)' },
      { field: 'timeZone', flags: '--timezone <tz>', description: 'Result timezone (default: your profile timezone)' },
      { field: 'all', flags: '--all', description: 'Include slots that clash with your calendar' },
      { field: 'summary', flags: '--summary', description: 'Only per-day ranges, no slot-by-slot list' },
    ],
  },
  endpoint: { method: 'GET', path: '/slots' },
  fieldMappings: {},
  handler: async (input, client) => {
    const ev = await resolveCalLink(input.url, client);
    const timeZone = await defaultTimeZone(client, input.timeZone);
    for (const d of [input.from, input.to]) {
      if (d !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new ValidationError(`Dates are YYYY-MM-DD: ${d}`);
    }
    const from = input.from ?? todayIn(timeZone);
    const to = input.to ?? addDays(from, 7);
    const length = ev.lengthInMinutes ?? 30;

    // /slots reads bare dates as UTC days, which shifts evening slots across days for
    // anyone off UTC. Send the instants your local days begin and end instead.
    const rangeStart = zonedDayStart(from, timeZone).toISOString();
    const rangeEnd = new Date(zonedDayStart(addDays(to, 1), timeZone).getTime() - 1000).toISOString();
    const starts = await openSlots(client, ev.eventTypeId, rangeStart, rangeEnd, timeZone);
    const mine = await myBusyTimes(client, addDays(from, -1), addDays(to, 1), timeZone);

    const slots = starts.map((start) => {
      const end = plusMinutes(start, length);
      const local = localParts(start, timeZone);
      const owner = ev.ownerScheduleTimeZone ? localParts(start, ev.ownerScheduleTimeZone) : undefined;
      return {
        start,
        end,
        date: local.date,
        time: local.time,
        ...(owner ? { ownerTime: `${owner.time} ${ev.ownerScheduleTimeZone}` } : {}),
        conflict: mine.checked ? overlapsBusy(start, length, mine.busy) : undefined,
      };
    }).filter((s) => s.date.slice(0, 10) >= from && s.date.slice(0, 10) <= to);
    const free = slots.filter((s) => s.conflict !== true);

    return {
      event: eventSummary(ev),
      timeZone,
      range: { from, to },
      conflictCheck: mine.checked
        ? { checked: true, calendars: mine.calendars, busyBlocks: mine.busy.length }
        : { checked: false, reason: mine.reason },
      summary: { open: slots.length, free: free.length, conflicts: slots.length - free.length },
      // Readable per-day ranges of free START times, in `timeZone`, e.g. "12:00–22:30".
      startsByDay: startsByDay(free, length),
      ...(input.summary ? {} : { slots: input.all ? slots : free }),
    };
  },
};

export const linkBookCommand: CommandDefinition = {
  name: 'link_book',
  group: 'link',
  subcommand: 'book',
  description:
    "Book a slot on someone else's Cal.com link as the attendee. Dry run unless --confirm: shows what would be booked and whether the slot is still open. The invite goes to the attendee email (default: your Cal.com profile email)",
  examples: [
    'calcom link book https://cal.com/someone/30min --start 2026-10-05T12:30:00-04:00',
    'calcom link book https://cal.com/someone/30min --start 2026-10-05T12:30:00-04:00 --notes "Agenda: ..." --confirm',
  ],
  auth: 'optional',
  inputSchema: z.object({
    url: z.string().describe('Cal.com booking link'),
    start: z.string().describe('Slot start, ISO 8601 with offset or Z (copy it from `link slots`)'),
    name: z.string().optional().describe('Attendee name (default: your Cal.com profile name)'),
    email: z.string().optional().describe('Attendee email: the invite lands on this calendar (default: your profile email)'),
    timeZone: z.string().optional().describe('Attendee timezone (default: your profile timezone)'),
    notes: z.string().optional().describe('Note to the host, e.g. a short agenda'),
    guests: z.string().optional().describe('Comma-separated extra guest emails'),
    confirm: z.boolean().optional().describe('Actually book. Without it this is a dry run'),
  }),
  cliMappings: {
    args: [{ field: 'url', name: 'url', required: true }],
    options: [
      { field: 'start', flags: '--start <iso>', description: 'Slot start ISO 8601 with offset (required)' },
      { field: 'name', flags: '--name <name>', description: 'Attendee name (default: profile name)' },
      { field: 'email', flags: '--email <email>', description: 'Attendee email (default: profile email)' },
      { field: 'timeZone', flags: '--timezone <tz>', description: 'Attendee timezone (default: profile timezone)' },
      { field: 'notes', flags: '--notes <text>', description: 'Note to the host' },
      { field: 'guests', flags: '--guests <emails>', description: 'Comma-separated guest emails' },
      { field: 'confirm', flags: '--confirm', description: 'Actually book (otherwise dry run)' },
    ],
  },
  endpoint: { method: 'POST', path: '/bookings' },
  fieldMappings: {},
  handler: async (input, client) => {
    if (!/(Z|[+-]\d{2}:\d{2})$/.test(input.start)) {
      throw new ValidationError('--start needs a timezone offset or Z, e.g. 2026-10-05T12:30:00-04:00');
    }
    const startMs = Date.parse(input.start);
    if (Number.isNaN(startMs)) throw new ValidationError(`Not a valid time: ${input.start}`);

    const ev = await resolveCalLink(input.url, client);
    const me = await myProfile(client);
    const attendee = {
      name: input.name ?? me?.name,
      email: input.email ?? me?.email,
      timeZone: input.timeZone ?? me?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: 'en',
    };
    if (!attendee.name || !attendee.email) {
      throw new ValidationError('No attendee name/email: pass --name and --email, or run `calcom login`.');
    }

    const length = ev.lengthInMinutes ?? 30;
    const day = ymd(new Date(startMs));
    const open = await openSlots(client, ev.eventTypeId, addDays(day, -1), addDays(day, 1), 'UTC');
    const slotOpen = open.some((s) => Date.parse(s) === startMs);
    const mine = await myBusyTimes(client, addDays(day, -1), addDays(day, 2), attendee.timeZone);
    const conflict = mine.checked ? overlapsBusy(input.start, length, mine.busy) : undefined;
    const guests = input.guests ? input.guests.split(',').map((g: string) => g.trim()).filter(Boolean) : undefined;
    const wouldBook = {
      start: new Date(startMs).toISOString(),
      end: new Date(startMs + length * 60_000).toISOString(),
      local: localParts(input.start, attendee.timeZone),
      attendee: { name: attendee.name, email: attendee.email, timeZone: attendee.timeZone },
      ...(guests ? { guests } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    };

    if (!input.confirm) {
      return {
        dryRun: true,
        message: 'Nothing booked. Re-run with --confirm to book this slot.',
        event: eventSummary(ev),
        wouldBook,
        slotOpen,
        conflictWithMyCalendar: conflict,
      };
    }
    if (!slotOpen) {
      throw new ValidationError('That slot is no longer open on their calendar. Run `calcom link slots` again.');
    }

    const body: Record<string, unknown> = {
      start: wouldBook.start,
      eventTypeId: ev.eventTypeId,
      attendee,
    };
    if (guests) body.guests = guests;
    // In API v2 the notes travel as a booking-field response, not a top-level field.
    if (input.notes) body.bookingFieldsResponses = { notes: input.notes };

    // Book anonymously, exactly as the public booking page does.
    const res: any = await client.anonymous().post('/bookings', body);
    const b = res?.data ?? res;
    return {
      booked: true,
      uid: b?.uid,
      status: b?.status,
      title: b?.title,
      start: b?.start,
      end: b?.end,
      meetingUrl: b?.meetingUrl ?? b?.location,
      hosts: (b?.hosts ?? []).map((h: any) => h?.email ?? h?.name),
      attendees: (b?.attendees ?? []).map((a: any) => a?.email),
      conflictWithMyCalendar: conflict,
      // Cal.com stamps the calendar invite with this iCalUID; use it to find the event.
      iCalUID: b?.uid ? `${b.uid}@Cal.com` : undefined,
      manage: {
        cancel: `calcom link cancel ${b?.uid} --confirm`,
        reschedule: `calcom link reschedule ${b?.uid} --start <ISO> --confirm`,
        page: b?.uid ? `https://cal.com/booking/${b.uid}` : undefined,
      },
      next: {
        acceptInvite:
          'The host\'s calendar sends you a Google invite. If your Google Calendar hides unanswered invites, ' +
          'it stays hidden until accepted: find it with showHiddenInvitations and accept it.',
        findLater: 'calcom bookings list --status upcoming --attendee-email <your email> (guest bookings are listed), or the invite\'s iCalUID',
        keepPrivate: 'The uid alone can move or cancel this meeting; do not paste it anywhere shared.',
      },
    };
  },
};

export const linkCancelCommand: CommandDefinition = {
  name: 'link_cancel',
  group: 'link',
  subcommand: 'cancel',
  description: 'Cancel a booking you made on someone else\'s link, by booking UID. Dry run unless --confirm',
  examples: ['calcom link cancel <uid> --reason "Something came up" --confirm'],
  auth: 'optional',
  inputSchema: z.object({
    uid: z.string().describe('Booking UID (from `link book`)'),
    reason: z.string().optional().describe('Cancellation reason shown to the host'),
    confirm: z.boolean().optional().describe('Actually cancel. Without it this is a dry run'),
  }),
  cliMappings: {
    args: [{ field: 'uid', name: 'uid', required: true }],
    options: [
      { field: 'reason', flags: '--reason <text>', description: 'Reason shown to the host' },
      { field: 'confirm', flags: '--confirm', description: 'Actually cancel (otherwise dry run)' },
    ],
  },
  endpoint: { method: 'POST', path: '/bookings/{uid}/cancel' },
  fieldMappings: {},
  handler: async (input, client) => {
    if (!input.confirm) {
      return { dryRun: true, message: `Nothing cancelled. Re-run with --confirm to cancel booking ${input.uid}.` };
    }
    const body = input.reason ? { cancellationReason: input.reason } : undefined;
    const res: any = await publicThenAuthed(client, (c) => c.post(`/bookings/${encodeURIComponent(input.uid)}/cancel`, body));
    const b = res?.data ?? res;
    return { cancelled: true, uid: b?.uid ?? input.uid, status: b?.status };
  },
};

export const linkRescheduleCommand: CommandDefinition = {
  name: 'link_reschedule',
  group: 'link',
  subcommand: 'reschedule',
  description:
    'Move a booking you made on someone else\'s link to another open slot, by booking UID. Dry run unless --confirm',
  examples: ['calcom link reschedule <uid> --start 2026-10-06T14:00:00-04:00 --confirm'],
  auth: 'optional',
  inputSchema: z.object({
    uid: z.string().describe('Booking UID (from `link book`)'),
    start: z.string().describe('New start, ISO 8601 with offset or Z'),
    reason: z.string().optional().describe('Reason shown to the host'),
    confirm: z.boolean().optional().describe('Actually reschedule. Without it this is a dry run'),
  }),
  cliMappings: {
    args: [{ field: 'uid', name: 'uid', required: true }],
    options: [
      { field: 'start', flags: '--start <iso>', description: 'New start ISO 8601 with offset (required)' },
      { field: 'reason', flags: '--reason <text>', description: 'Reason shown to the host' },
      { field: 'confirm', flags: '--confirm', description: 'Actually reschedule (otherwise dry run)' },
    ],
  },
  endpoint: { method: 'POST', path: '/bookings/{uid}/reschedule' },
  fieldMappings: {},
  handler: async (input, client) => {
    if (!/(Z|[+-]\d{2}:\d{2})$/.test(input.start) || Number.isNaN(Date.parse(input.start))) {
      throw new ValidationError('--start needs a full ISO time with offset or Z');
    }
    const start = new Date(Date.parse(input.start)).toISOString();
    if (!input.confirm) {
      return { dryRun: true, message: `Nothing moved. Re-run with --confirm to move ${input.uid} to ${start}.` };
    }
    const body: Record<string, unknown> = { start };
    if (input.reason) body.reschedulingReason = input.reason;
    const res: any = await publicThenAuthed(client, (c) =>
      c.post(`/bookings/${encodeURIComponent(input.uid)}/reschedule`, body),
    );
    const b = res?.data ?? res;
    // Cal.com issues a NEW booking UID on reschedule; the old one is dead.
    return {
      rescheduled: true,
      previousUid: input.uid,
      uid: b?.uid,
      note: 'Rescheduling creates a new booking UID. Use `uid` from now on.',
      status: b?.status,
      start: b?.start,
      end: b?.end,
      manage: {
        cancel: `calcom link cancel ${b?.uid} --confirm`,
        reschedule: `calcom link reschedule ${b?.uid} --start <ISO> --confirm`,
        page: b?.uid ? `https://cal.com/booking/${b.uid}` : undefined,
      },
    };
  },
};

export const linkCommands: CommandDefinition[] = [
  linkResolveCommand,
  linkSlotsCommand,
  linkBookCommand,
  linkCancelCommand,
  linkRescheduleCommand,
];
