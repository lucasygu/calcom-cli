import { z } from 'zod';
import { executeCommand } from '../../core/handler.js';
import type { CommandDefinition } from '../../core/types.js';

export const bookingsListCommand: CommandDefinition = {
  name: 'bookings_list',
  group: 'bookings',
  subcommand: 'list',
  description: 'List bookings for the authenticated user. Filter by status, attendee, date range.',
  examples: [
    'calcom bookings list',
    'calcom bookings list --status upcoming',
    'calcom bookings list --attendeeEmail john@example.com --take 10',
  ],
  inputSchema: z.object({
    status: z.string().optional().describe('Filter by status: upcoming, recurring, past, cancelled, unconfirmed'),
    attendeeEmail: z.string().optional().describe('Filter by attendee email address'),
    eventTypeId: z.coerce.number().optional().describe('Filter by event type ID'),
    eventTypeIds: z.string().optional().describe('Comma-separated list of event type IDs'),
    afterStart: z.string().optional().describe('Filter bookings starting after this ISO datetime'),
    beforeEnd: z.string().optional().describe('Filter bookings ending before this ISO datetime'),
    sortStart: z.string().optional().describe('Sort by start time: asc or desc'),
    sortEnd: z.string().optional().describe('Sort by end time: asc or desc'),
    sortCreated: z.string().optional().describe('Sort by created time: asc or desc'),
    take: z.coerce.number().optional().describe('Number of results to return'),
    skip: z.coerce.number().optional().describe('Number of results to skip (offset)'),
    teamsIds: z.string().optional().describe('Comma-separated list of team IDs'),
  }),
  cliMappings: {
    options: [
      { field: 'status', flags: '--status <status>', description: 'Filter: upcoming, recurring, past, cancelled, unconfirmed' },
      { field: 'attendeeEmail', flags: '--attendee-email <email>', description: 'Filter by attendee email' },
      { field: 'eventTypeId', flags: '--event-type-id <id>', description: 'Filter by event type ID' },
      { field: 'eventTypeIds', flags: '--event-type-ids <ids>', description: 'Comma-separated event type IDs' },
      { field: 'afterStart', flags: '--after-start <iso>', description: 'After this start time (ISO)' },
      { field: 'beforeEnd', flags: '--before-end <iso>', description: 'Before this end time (ISO)' },
      { field: 'sortStart', flags: '--sort-start <dir>', description: 'Sort by start: asc/desc' },
      { field: 'sortEnd', flags: '--sort-end <dir>', description: 'Sort by end: asc/desc' },
      { field: 'sortCreated', flags: '--sort-created <dir>', description: 'Sort by created: asc/desc' },
      { field: 'take', flags: '--take <n>', description: 'Number of results' },
      { field: 'skip', flags: '--skip <n>', description: 'Offset' },
      { field: 'teamsIds', flags: '--teams-ids <ids>', description: 'Comma-separated team IDs' },
    ],
  },
  endpoint: { method: 'GET', path: '/bookings' },
  fieldMappings: {
    status: 'query',
    attendeeEmail: 'query',
    eventTypeId: 'query',
    eventTypeIds: 'query',
    afterStart: 'query',
    beforeEnd: 'query',
    sortStart: 'query',
    sortEnd: 'query',
    sortCreated: 'query',
    take: 'query',
    skip: 'query',
    teamsIds: 'query',
  },
  handler: (input, client) => executeCommand(bookingsListCommand, input, client),
};

export const bookingsGetCommand: CommandDefinition = {
  name: 'bookings_get',
  group: 'bookings',
  subcommand: 'get',
  description: 'Get a specific booking by its UID',
  examples: ['calcom bookings get abc123'],
  inputSchema: z.object({
    bookingUid: z.string().describe('Booking UID'),
  }),
  cliMappings: {
    args: [{ field: 'bookingUid', name: 'bookingUid', required: true }],
  },
  endpoint: { method: 'GET', path: '/bookings/{bookingUid}' },
  fieldMappings: { bookingUid: 'path' },
  handler: (input, client) => executeCommand(bookingsGetCommand, input, client),
};

export const bookingsCreateCommand: CommandDefinition = {
  name: 'bookings_create',
  group: 'bookings',
  subcommand: 'create',
  description: 'Create a new booking. Requires eventTypeId, start time, and attendee details.',
  examples: [
    'calcom bookings create --event-type-id 123 --start "2025-03-20T10:00:00Z" --attendee-name "John" --attendee-email john@example.com --attendee-timezone America/New_York',
  ],
  inputSchema: z.object({
    eventTypeId: z.coerce.number().describe('Event type ID to book'),
    start: z.string().describe('Start time in ISO 8601 format'),
    attendeeName: z.string().describe('Attendee full name'),
    attendeeEmail: z.string().describe('Attendee email address'),
    attendeeTimezone: z.string().describe('Attendee timezone (e.g. America/New_York)'),
    attendeeLanguage: z.string().optional().describe('Attendee language (e.g. en)'),
    guests: z.string().optional().describe('Comma-separated guest email addresses'),
    meetingUrl: z.string().optional().describe('Custom meeting URL'),
    notes: z.string().optional().describe('Booking notes'),
    metadata: z.string().optional().describe('JSON string of metadata key-value pairs'),
  }),
  cliMappings: {
    options: [
      { field: 'eventTypeId', flags: '--event-type-id <id>', description: 'Event type ID (required)' },
      { field: 'start', flags: '--start <iso>', description: 'Start time ISO 8601 (required)' },
      { field: 'attendeeName', flags: '--attendee-name <name>', description: 'Attendee name (required)' },
      { field: 'attendeeEmail', flags: '--attendee-email <email>', description: 'Attendee email (required)' },
      { field: 'attendeeTimezone', flags: '--attendee-timezone <tz>', description: 'Attendee timezone (required)' },
      { field: 'attendeeLanguage', flags: '--attendee-language <lang>', description: 'Attendee language' },
      { field: 'guests', flags: '--guests <emails>', description: 'Comma-separated guest emails' },
      { field: 'meetingUrl', flags: '--meeting-url <url>', description: 'Custom meeting URL' },
      { field: 'notes', flags: '--notes <text>', description: 'Booking notes' },
      { field: 'metadata', flags: '--metadata <json>', description: 'JSON metadata' },
    ],
  },
  endpoint: { method: 'POST', path: '/bookings' },
  fieldMappings: {},
  handler: async (input, client) => {
    const body: Record<string, unknown> = {
      eventTypeId: input.eventTypeId,
      start: input.start,
      attendee: {
        name: input.attendeeName,
        email: input.attendeeEmail,
        timeZone: input.attendeeTimezone,
        language: input.attendeeLanguage ?? 'en',
      },
    };
    if (input.guests) body.guests = input.guests.split(',').map((g: string) => g.trim());
    if (input.meetingUrl) body.meetingUrl = input.meetingUrl;
    // API v2 takes notes as a booking-field response, not a top-level `notes`.
    if (input.notes) body.bookingFieldsResponses = { notes: input.notes };
    if (input.metadata) {
      try { body.metadata = JSON.parse(input.metadata); } catch { body.metadata = {}; }
    }
    return client.post('/bookings', body);
  },
};

export const bookingsCancelCommand: CommandDefinition = {
  name: 'bookings_cancel',
  group: 'bookings',
  subcommand: 'cancel',
  description: 'Cancel a booking by UID',
  examples: ['calcom bookings cancel abc123 --reason "Schedule conflict"'],
  inputSchema: z.object({
    bookingUid: z.string().describe('Booking UID'),
    cancellationReason: z.string().optional().describe('Reason for cancellation'),
  }),
  cliMappings: {
    args: [{ field: 'bookingUid', name: 'bookingUid', required: true }],
    options: [
      { field: 'cancellationReason', flags: '--reason <text>', description: 'Cancellation reason' },
    ],
  },
  endpoint: { method: 'POST', path: '/bookings/{bookingUid}/cancel' },
  fieldMappings: { bookingUid: 'path', cancellationReason: 'body' },
  handler: (input, client) => executeCommand(bookingsCancelCommand, input, client),
};

export const bookingsConfirmCommand: CommandDefinition = {
  name: 'bookings_confirm',
  group: 'bookings',
  subcommand: 'confirm',
  description: 'Confirm a pending booking',
  examples: ['calcom bookings confirm abc123'],
  inputSchema: z.object({
    bookingUid: z.string().describe('Booking UID'),
  }),
  cliMappings: {
    args: [{ field: 'bookingUid', name: 'bookingUid', required: true }],
  },
  endpoint: { method: 'POST', path: '/bookings/{bookingUid}/confirm' },
  fieldMappings: { bookingUid: 'path' },
  handler: (input, client) => executeCommand(bookingsConfirmCommand, input, client),
};

export const bookingsDeclineCommand: CommandDefinition = {
  name: 'bookings_decline',
  group: 'bookings',
  subcommand: 'decline',
  description: 'Decline a pending booking',
  examples: ['calcom bookings decline abc123 --reason "Not available"'],
  inputSchema: z.object({
    bookingUid: z.string().describe('Booking UID'),
    reason: z.string().optional().describe('Reason for declining'),
  }),
  cliMappings: {
    args: [{ field: 'bookingUid', name: 'bookingUid', required: true }],
    options: [
      { field: 'reason', flags: '--reason <text>', description: 'Decline reason' },
    ],
  },
  endpoint: { method: 'POST', path: '/bookings/{bookingUid}/decline' },
  fieldMappings: { bookingUid: 'path', reason: 'body' },
  handler: (input, client) => executeCommand(bookingsDeclineCommand, input, client),
};

export const bookingsRescheduleCommand: CommandDefinition = {
  name: 'bookings_reschedule',
  group: 'bookings',
  subcommand: 'reschedule',
  description: 'Reschedule a booking to a new time',
  examples: ['calcom bookings reschedule abc123 --start "2025-03-21T14:00:00Z" --reason "Conflict"'],
  inputSchema: z.object({
    bookingUid: z.string().describe('Booking UID'),
    start: z.string().describe('New start time in ISO 8601'),
    // The API field is `reschedulingReason`; `rescheduleReason` is rejected with a 400.
    reschedulingReason: z.string().optional().describe('Reason for rescheduling'),
  }),
  cliMappings: {
    args: [{ field: 'bookingUid', name: 'bookingUid', required: true }],
    options: [
      { field: 'start', flags: '--start <iso>', description: 'New start time (required)' },
      { field: 'reschedulingReason', flags: '--reason <text>', description: 'Reschedule reason' },
    ],
  },
  endpoint: { method: 'POST', path: '/bookings/{bookingUid}/reschedule' },
  fieldMappings: { bookingUid: 'path', start: 'body', reschedulingReason: 'body' },
  handler: (input, client) => executeCommand(bookingsRescheduleCommand, input, client),
};

export const bookingsMarkAbsenceCommand: CommandDefinition = {
  name: 'bookings_mark_absence',
  group: 'bookings',
  subcommand: 'mark-absence',
  description: 'Mark a no-show / absence for a booking',
  examples: ['calcom bookings mark-absence abc123'],
  inputSchema: z.object({
    bookingUid: z.string().describe('Booking UID'),
    host: z.boolean().optional().describe('Whether the host was absent'),
    attendees: z.string().optional().describe('Comma-separated email addresses of absent attendees'),
  }),
  cliMappings: {
    args: [{ field: 'bookingUid', name: 'bookingUid', required: true }],
    options: [
      { field: 'host', flags: '--host', description: 'Mark host as absent' },
      { field: 'attendees', flags: '--attendees <emails>', description: 'Absent attendee emails (comma-separated)' },
    ],
  },
  // The subcommand keeps its old name; the API route is /mark-absent.
  endpoint: { method: 'POST', path: '/bookings/{bookingUid}/mark-absent' },
  fieldMappings: { bookingUid: 'path' },
  handler: async (input, client) => {
    const body: Record<string, unknown> = {};
    if (input.host) body.host = true;
    if (input.attendees) {
      body.attendees = input.attendees.split(',').map((e: string) => ({ email: e.trim(), absent: true }));
    }
    const path = `/bookings/${encodeURIComponent(input.bookingUid)}/mark-absent`;
    return client.post(path, body);
  },
};

export const bookingsReassignCommand: CommandDefinition = {
  name: 'bookings_reassign',
  group: 'bookings',
  subcommand: 'reassign',
  description: 'Reassign a booking to a different host (round-robin)',
  examples: ['calcom bookings reassign abc123'],
  inputSchema: z.object({
    bookingUid: z.string().describe('Booking UID'),
  }),
  cliMappings: {
    args: [{ field: 'bookingUid', name: 'bookingUid', required: true }],
  },
  endpoint: { method: 'POST', path: '/bookings/{bookingUid}/reassign' },
  fieldMappings: { bookingUid: 'path' },
  handler: (input, client) => executeCommand(bookingsReassignCommand, input, client),
};

export const bookingsUpdateLocationCommand: CommandDefinition = {
  name: 'bookings_update_location',
  group: 'bookings',
  subcommand: 'update-location',
  description: 'Update the location/meeting link for a booking',
  examples: ['calcom bookings update-location abc123 --type integration --integration google-meet'],
  inputSchema: z.object({
    bookingUid: z.string().describe('Booking UID'),
    type: z.string().describe('Location type: link, integration, address, phone'),
    link: z.string().optional().describe('Meeting link URL'),
    integration: z.string().optional().describe('Integration slug (e.g. google-meet, zoom, cal-video)'),
    address: z.string().optional().describe('Physical address'),
    phone: z.string().optional().describe('Phone number'),
  }),
  cliMappings: {
    args: [{ field: 'bookingUid', name: 'bookingUid', required: true }],
    options: [
      { field: 'type', flags: '--type <type>', description: 'Location type (required)' },
      { field: 'link', flags: '--link <url>', description: 'Meeting link' },
      { field: 'integration', flags: '--integration <name>', description: 'Integration name' },
      { field: 'address', flags: '--address <addr>', description: 'Physical address' },
      { field: 'phone', flags: '--phone <number>', description: 'Phone number' },
    ],
  },
  endpoint: { method: 'PATCH', path: '/bookings/{bookingUid}/location' },
  fieldMappings: { bookingUid: 'path' },
  handler: async (input, client) => {
    const location: Record<string, unknown> = { type: input.type };
    if (input.link) location.link = input.link;
    if (input.integration) location.integration = input.integration;
    if (input.address) location.address = input.address;
    if (input.phone) location.phone = input.phone;
    const path = `/bookings/${encodeURIComponent(input.bookingUid)}/location`;
    return client.patch(path, { location });
  },
};

export const bookingsAttendeesCommand: CommandDefinition = {
  name: 'bookings_attendees',
  group: 'bookings',
  subcommand: 'attendees',
  description: 'List attendees for a booking',
  examples: ['calcom bookings attendees abc123'],
  inputSchema: z.object({
    bookingUid: z.string().describe('Booking UID'),
  }),
  cliMappings: {
    args: [{ field: 'bookingUid', name: 'bookingUid', required: true }],
  },
  endpoint: { method: 'GET', path: '/bookings/{bookingUid}/attendees' },
  fieldMappings: { bookingUid: 'path' },
  handler: (input, client) => executeCommand(bookingsAttendeesCommand, input, client),
};

export const bookingsAddAttendeeCommand: CommandDefinition = {
  name: 'bookings_add_attendee',
  group: 'bookings',
  subcommand: 'add-attendee',
  description: 'Add an attendee to an existing booking',
  examples: ['calcom bookings add-attendee abc123 --name "Jane" --email jane@example.com --timezone America/Chicago'],
  inputSchema: z.object({
    bookingUid: z.string().describe('Booking UID'),
    name: z.string().describe('Attendee name'),
    email: z.string().describe('Attendee email'),
    timeZone: z.string().describe('Attendee timezone'),
    language: z.string().optional().describe('Attendee language'),
  }),
  cliMappings: {
    args: [{ field: 'bookingUid', name: 'bookingUid', required: true }],
    options: [
      { field: 'name', flags: '--name <name>', description: 'Attendee name (required)' },
      { field: 'email', flags: '--email <email>', description: 'Attendee email (required)' },
      { field: 'timeZone', flags: '--timezone <tz>', description: 'Timezone (required)' },
      { field: 'language', flags: '--language <lang>', description: 'Language code' },
    ],
  },
  endpoint: { method: 'POST', path: '/bookings/{bookingUid}/attendees' },
  fieldMappings: { bookingUid: 'path', name: 'body', email: 'body', timeZone: 'body', language: 'body' },
  handler: (input, client) => executeCommand(bookingsAddAttendeeCommand, input, client),
};

export const bookingsAddGuestsCommand: CommandDefinition = {
  name: 'bookings_add_guests',
  group: 'bookings',
  subcommand: 'add-guests',
  description: 'Add guest email addresses to an existing booking',
  examples: ['calcom bookings add-guests abc123 --guests guest1@example.com,guest2@example.com'],
  inputSchema: z.object({
    bookingUid: z.string().describe('Booking UID'),
    guests: z.string().describe('Comma-separated guest email addresses'),
  }),
  cliMappings: {
    args: [{ field: 'bookingUid', name: 'bookingUid', required: true }],
    options: [
      { field: 'guests', flags: '--guests <emails>', description: 'Guest emails (comma-separated, required)' },
    ],
  },
  endpoint: { method: 'POST', path: '/bookings/{bookingUid}/guests' },
  fieldMappings: { bookingUid: 'path' },
  handler: async (input, client) => {
    const guests = input.guests.split(',').map((g: string) => g.trim());
    const path = `/bookings/${encodeURIComponent(input.bookingUid)}/guests`;
    return client.post(path, { guests });
  },
};

export const bookingsCommands: CommandDefinition[] = [
  bookingsListCommand,
  bookingsGetCommand,
  bookingsCreateCommand,
  bookingsCancelCommand,
  bookingsConfirmCommand,
  bookingsDeclineCommand,
  bookingsRescheduleCommand,
  bookingsMarkAbsenceCommand,
  bookingsReassignCommand,
  bookingsUpdateLocationCommand,
  bookingsAttendeesCommand,
  bookingsAddAttendeeCommand,
  bookingsAddGuestsCommand,
];
