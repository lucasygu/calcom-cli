import { z } from 'zod';
import { executeCommand } from '../../core/handler.js';
import { myBusyTimes } from '../../core/busy.js';
import type { CommandDefinition } from '../../core/types.js';

/** The `{calendar}` path segment: a calendar type, never a credential ID. */
const CALENDAR_TYPES = ['apple', 'google', 'office365'] as const;

export const calendarsListCommand: CommandDefinition = {
  name: 'calendars_list',
  group: 'calendars',
  subcommand: 'list',
  description: 'List connected calendars for the authenticated user',
  examples: ['calcom calendars list'],
  inputSchema: z.object({}),
  cliMappings: {},
  endpoint: { method: 'GET', path: '/calendars' },
  fieldMappings: {},
  handler: (input, client) => executeCommand(calendarsListCommand, input, client),
};

export const calendarsBusyCommand: CommandDefinition = {
  name: 'calendars_busy',
  group: 'calendars',
  subcommand: 'busy',
  description:
    'Get busy times from your connected calendars (the ones Cal.com checks for conflicts) within a date range',
  examples: ['calcom calendars busy --date-from "2025-03-20" --date-to "2025-03-27" --timezone America/Toronto'],
  inputSchema: z.object({
    dateFrom: z.string().describe('Start date (YYYY-MM-DD or ISO)'),
    dateTo: z.string().describe('End date (YYYY-MM-DD or ISO)'),
    loggedInUsersTz: z.string().optional().describe('Timezone of the logged in user (default UTC)'),
    credentialId: z.coerce.number().optional().describe('Only this calendar credential'),
  }),
  cliMappings: {
    options: [
      { field: 'dateFrom', flags: '--date-from <date>', description: 'Start date (required)' },
      { field: 'dateTo', flags: '--date-to <date>', description: 'End date (required)' },
      { field: 'loggedInUsersTz', flags: '--timezone <tz>', description: 'Your timezone' },
      { field: 'credentialId', flags: '--credential-id <id>', description: 'Calendar credential ID' },
    ],
  },
  // The old path `/calendars/busy` does not exist (404). The real endpoint is
  // `/calendars/busy-times`, which needs each calendar listed explicitly.
  endpoint: { method: 'GET', path: '/calendars/busy-times' },
  fieldMappings: {},
  handler: async (input, client) => {
    const result = await myBusyTimes(client, input.dateFrom, input.dateTo, input.loggedInUsersTz ?? 'UTC', {
      credentialId: input.credentialId,
    });
    return result;
  },
};

export const calendarsCheckCommand: CommandDefinition = {
  name: 'calendars_check',
  group: 'calendars',
  subcommand: 'check',
  description: 'Check the connection of a calendar type (apple, google or office365)',
  examples: ['calcom calendars check google'],
  inputSchema: z.object({
    // The path takes a calendar type; a credential ID is rejected as an invalid type.
    calendar: z.enum(CALENDAR_TYPES).describe('Calendar type: apple, google or office365'),
  }),
  cliMappings: {
    args: [{ field: 'calendar', name: 'calendar', required: true }],
  },
  endpoint: { method: 'GET', path: '/calendars/{calendar}/check' },
  fieldMappings: { calendar: 'path' },
  handler: (input, client) => executeCommand(calendarsCheckCommand, input, client),
};

export const calendarsSaveCredentialsCommand: CommandDefinition = {
  name: 'calendars_save_credentials',
  group: 'calendars',
  subcommand: 'save-credentials',
  description: 'Save calendar credentials (e.g. Apple Calendar password)',
  examples: ['calcom calendars save-credentials --type apple --username user@icloud.com --password xxxx'],
  inputSchema: z.object({
    type: z.enum(['apple']).describe('Calendar type (only apple takes credentials)'),
    username: z.string().describe('Calendar username/email'),
    password: z.string().describe('App-specific password'),
  }),
  cliMappings: {
    options: [
      { field: 'type', flags: '--type <type>', description: 'Calendar type (required; apple)' },
      { field: 'username', flags: '--username <user>', description: 'Username (required)' },
      { field: 'password', flags: '--password <pass>', description: 'Password (required)' },
    ],
  },
  endpoint: { method: 'POST', path: '/calendars/{type}/credentials' },
  fieldMappings: { type: 'path', username: 'body', password: 'body' },
  handler: (input, client) => executeCommand(calendarsSaveCredentialsCommand, input, client),
};

export const calendarsDisconnectCommand: CommandDefinition = {
  name: 'calendars_disconnect',
  group: 'calendars',
  subcommand: 'disconnect',
  description: 'Disconnect a calendar by credential ID (from `calendars list`)',
  examples: ['calcom calendars disconnect 456 --calendar google'],
  inputSchema: z.object({
    credentialId: z.coerce.number().int().describe('Calendar credential ID'),
    calendar: z.enum(CALENDAR_TYPES).describe('Calendar type: apple, google or office365'),
  }),
  cliMappings: {
    args: [{ field: 'credentialId', name: 'credentialId', required: true }],
    options: [{ field: 'calendar', flags: '--calendar <type>', description: 'apple|google|office365 (required)' }],
  },
  endpoint: { method: 'POST', path: '/calendars/{calendar}/disconnect' },
  fieldMappings: { calendar: 'path' },
  handler: async (input, client) =>
    client.post(`/calendars/${input.calendar}/disconnect`, { id: input.credentialId }),
};

export const calendarsCommands: CommandDefinition[] = [
  calendarsListCommand,
  calendarsBusyCommand,
  calendarsCheckCommand,
  calendarsSaveCredentialsCommand,
  calendarsDisconnectCommand,
];
