import { z } from 'zod';
import { executeCommand } from '../../core/handler.js';
import type { CommandDefinition } from '../../core/types.js';

export const slotsAvailableCommand: CommandDefinition = {
  name: 'slots_available',
  group: 'slots',
  subcommand: 'available',
  description: 'Get available time slots for an event type within a date range',
  examples: [
    'calcom slots available --event-type-id 123 --start-time "2025-03-20T00:00:00Z" --end-time "2025-03-27T00:00:00Z"',
  ],
  inputSchema: z.object({
    eventTypeId: z.coerce.number().describe('Event type ID'),
    startTime: z.string().describe('Start of range (ISO 8601)'),
    endTime: z.string().describe('End of range (ISO 8601)'),
    eventTypeSlug: z.string().optional().describe('Event type slug (alternative to ID)'),
    username: z.string().optional().describe('Username for the event type'),
    timeZone: z.string().optional().describe('Timezone for returned slots'),
    duration: z.coerce.number().optional().describe('Override duration in minutes'),
    orgSlug: z.string().optional().describe('Organization slug'),
  }),
  cliMappings: {
    options: [
      { field: 'eventTypeId', flags: '--event-type-id <id>', description: 'Event type ID (required)' },
      { field: 'startTime', flags: '--start-time <iso>', description: 'Range start (required)' },
      { field: 'endTime', flags: '--end-time <iso>', description: 'Range end (required)' },
      { field: 'eventTypeSlug', flags: '--event-type-slug <slug>', description: 'Event type slug' },
      { field: 'username', flags: '--username <name>', description: 'Username' },
      { field: 'timeZone', flags: '--timezone <tz>', description: 'Timezone for results' },
      { field: 'duration', flags: '--duration <min>', description: 'Duration override' },
      { field: 'orgSlug', flags: '--org-slug <slug>', description: 'Organization slug' },
    ],
  },
  endpoint: { method: 'GET', path: '/slots/available' },
  fieldMappings: {
    eventTypeId: 'query',
    startTime: 'query',
    endTime: 'query',
    eventTypeSlug: 'query',
    username: 'query',
    timeZone: 'query',
    duration: 'query',
    orgSlug: 'query',
  },
  handler: (input, client) => executeCommand(slotsAvailableCommand, input, client),
};

export const slotsReserveCommand: CommandDefinition = {
  name: 'slots_reserve',
  group: 'slots',
  subcommand: 'reserve',
  description: 'Reserve a time slot (hold it temporarily before creating a booking)',
  examples: ['calcom slots reserve --event-type-id 123 --slot-utc "2025-03-20T10:00:00Z"'],
  inputSchema: z.object({
    eventTypeId: z.coerce.number().describe('Event type ID'),
    slotUtc: z.string().describe('Slot start time in UTC (ISO 8601)'),
  }),
  cliMappings: {
    options: [
      { field: 'eventTypeId', flags: '--event-type-id <id>', description: 'Event type ID (required)' },
      { field: 'slotUtc', flags: '--slot-utc <iso>', description: 'Slot time in UTC (required)' },
    ],
  },
  endpoint: { method: 'POST', path: '/slots/reserve' },
  fieldMappings: { eventTypeId: 'body', slotUtc: 'body' },
  handler: (input, client) => executeCommand(slotsReserveCommand, input, client),
};

export const slotsGetReservedCommand: CommandDefinition = {
  name: 'slots_get_reserved',
  group: 'slots',
  subcommand: 'get-reserved',
  description: 'Get details of a reserved slot by UID',
  examples: ['calcom slots get-reserved abc123'],
  inputSchema: z.object({
    uid: z.string().describe('Reserved slot UID'),
  }),
  cliMappings: {
    args: [{ field: 'uid', name: 'uid', required: true }],
  },
  endpoint: { method: 'GET', path: '/slots/reserved/{uid}' },
  fieldMappings: { uid: 'path' },
  handler: (input, client) => executeCommand(slotsGetReservedCommand, input, client),
};

export const slotsUpdateReservedCommand: CommandDefinition = {
  name: 'slots_update_reserved',
  group: 'slots',
  subcommand: 'update-reserved',
  description: 'Update a reserved slot (change the held time)',
  examples: ['calcom slots update-reserved abc123 --slot-utc "2025-03-20T11:00:00Z"'],
  inputSchema: z.object({
    uid: z.string().describe('Reserved slot UID'),
    slotUtc: z.string().describe('New slot time in UTC (ISO 8601)'),
    eventTypeId: z.coerce.number().optional().describe('Event type ID'),
  }),
  cliMappings: {
    args: [{ field: 'uid', name: 'uid', required: true }],
    options: [
      { field: 'slotUtc', flags: '--slot-utc <iso>', description: 'New slot time (required)' },
      { field: 'eventTypeId', flags: '--event-type-id <id>', description: 'Event type ID' },
    ],
  },
  endpoint: { method: 'PATCH', path: '/slots/reserved/{uid}' },
  fieldMappings: { uid: 'path', slotUtc: 'body', eventTypeId: 'body' },
  handler: (input, client) => executeCommand(slotsUpdateReservedCommand, input, client),
};

export const slotsDeleteReservedCommand: CommandDefinition = {
  name: 'slots_delete_reserved',
  group: 'slots',
  subcommand: 'delete-reserved',
  description: 'Release/cancel a reserved slot',
  examples: ['calcom slots delete-reserved abc123'],
  inputSchema: z.object({
    uid: z.string().describe('Reserved slot UID'),
  }),
  cliMappings: {
    args: [{ field: 'uid', name: 'uid', required: true }],
  },
  endpoint: { method: 'DELETE', path: '/slots/reserved/{uid}' },
  fieldMappings: { uid: 'path' },
  handler: (input, client) => executeCommand(slotsDeleteReservedCommand, input, client),
};

export const slotsCommands: CommandDefinition[] = [
  slotsAvailableCommand,
  slotsReserveCommand,
  slotsGetReservedCommand,
  slotsUpdateReservedCommand,
  slotsDeleteReservedCommand,
];
