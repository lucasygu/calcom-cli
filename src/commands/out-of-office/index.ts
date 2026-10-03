import { z } from 'zod';
import { executeCommand } from '../../core/handler.js';
import type { CommandDefinition } from '../../core/types.js';

// Your own out-of-office entries live under /me/ooo (/out-of-office does not exist).
const OOO_REASONS = ['unspecified', 'vacation', 'travel', 'sick', 'public_holiday'] as const;

export const oooListCommand: CommandDefinition = {
  name: 'ooo_list',
  group: 'out-of-office',
  subcommand: 'list',
  description: 'List all out-of-office entries',
  examples: ['calcom out-of-office list'],
  inputSchema: z.object({}),
  cliMappings: {},
  endpoint: { method: 'GET', path: '/me/ooo' },
  fieldMappings: {},
  handler: (input, client) => executeCommand(oooListCommand, input, client),
};

export const oooCreateCommand: CommandDefinition = {
  name: 'ooo_create',
  group: 'out-of-office',
  subcommand: 'create',
  description: 'Create a new out-of-office entry',
  examples: ['calcom out-of-office create --start "2025-03-25T00:00:00Z" --end "2025-03-28T23:59:59Z" --reason vacation'],
  inputSchema: z.object({
    start: z.string().describe('Start, ISO 8601 in UTC'),
    end: z.string().describe('End, ISO 8601 in UTC'),
    reason: z.enum(OOO_REASONS).optional().describe('unspecified, vacation, travel, sick or public_holiday'),
    notes: z.string().optional().describe('Notes'),
    toUserId: z.coerce.number().optional().describe('Redirect bookings to this user ID'),
  }),
  cliMappings: {
    options: [
      { field: 'start', flags: '--start <iso>', description: 'Start, ISO 8601 UTC (required)' },
      { field: 'end', flags: '--end <iso>', description: 'End, ISO 8601 UTC (required)' },
      { field: 'reason', flags: '--reason <reason>', description: 'unspecified|vacation|travel|sick|public_holiday' },
      { field: 'notes', flags: '--notes <text>', description: 'Notes' },
      { field: 'toUserId', flags: '--to-user-id <id>', description: 'Redirect to user ID' },
    ],
  },
  endpoint: { method: 'POST', path: '/me/ooo' },
  fieldMappings: { start: 'body', end: 'body', reason: 'body', notes: 'body', toUserId: 'body' },
  handler: (input, client) => executeCommand(oooCreateCommand, input, client),
};

export const oooUpdateCommand: CommandDefinition = {
  name: 'ooo_update',
  group: 'out-of-office',
  subcommand: 'update',
  description: 'Update an out-of-office entry',
  examples: ['calcom out-of-office update 123 --notes "Extended vacation"'],
  inputSchema: z.object({
    entryId: z.coerce.number().describe('OOO entry ID'),
    start: z.string().optional().describe('Start, ISO 8601 in UTC'),
    end: z.string().optional().describe('End, ISO 8601 in UTC'),
    reason: z.enum(OOO_REASONS).optional().describe('unspecified, vacation, travel, sick or public_holiday'),
    notes: z.string().optional().describe('Notes'),
    toUserId: z.coerce.number().optional().describe('Redirect to user ID'),
  }),
  cliMappings: {
    args: [{ field: 'entryId', name: 'entryId', required: true }],
    options: [
      { field: 'start', flags: '--start <iso>', description: 'Start, ISO 8601 UTC' },
      { field: 'end', flags: '--end <iso>', description: 'End, ISO 8601 UTC' },
      { field: 'reason', flags: '--reason <reason>', description: 'unspecified|vacation|travel|sick|public_holiday' },
      { field: 'notes', flags: '--notes <text>', description: 'Notes' },
      { field: 'toUserId', flags: '--to-user-id <id>', description: 'Redirect to user ID' },
    ],
  },
  endpoint: { method: 'PATCH', path: '/me/ooo/{entryId}' },
  fieldMappings: { entryId: 'path', start: 'body', end: 'body', reason: 'body', notes: 'body', toUserId: 'body' },
  handler: (input, client) => executeCommand(oooUpdateCommand, input, client),
};

export const oooDeleteCommand: CommandDefinition = {
  name: 'ooo_delete',
  group: 'out-of-office',
  subcommand: 'delete',
  description: 'Delete an out-of-office entry',
  examples: ['calcom out-of-office delete 123'],
  inputSchema: z.object({
    entryId: z.coerce.number().describe('OOO entry ID'),
  }),
  cliMappings: {
    args: [{ field: 'entryId', name: 'entryId', required: true }],
  },
  endpoint: { method: 'DELETE', path: '/me/ooo/{entryId}' },
  fieldMappings: { entryId: 'path' },
  handler: (input, client) => executeCommand(oooDeleteCommand, input, client),
};

export const outOfOfficeCommands: CommandDefinition[] = [
  oooListCommand,
  oooCreateCommand,
  oooUpdateCommand,
  oooDeleteCommand,
];
