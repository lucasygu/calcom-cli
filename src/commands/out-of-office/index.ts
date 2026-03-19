import { z } from 'zod';
import { executeCommand } from '../../core/handler.js';
import type { CommandDefinition } from '../../core/types.js';

export const oooListCommand: CommandDefinition = {
  name: 'ooo_list',
  group: 'out-of-office',
  subcommand: 'list',
  description: 'List all out-of-office entries',
  examples: ['calcom out-of-office list'],
  inputSchema: z.object({}),
  cliMappings: {},
  endpoint: { method: 'GET', path: '/out-of-office' },
  fieldMappings: {},
  handler: (input, client) => executeCommand(oooListCommand, input, client),
};

export const oooCreateCommand: CommandDefinition = {
  name: 'ooo_create',
  group: 'out-of-office',
  subcommand: 'create',
  description: 'Create a new out-of-office entry',
  examples: ['calcom out-of-office create --start "2025-03-25" --end "2025-03-28" --notes "Vacation"'],
  inputSchema: z.object({
    start: z.string().describe('Start date (YYYY-MM-DD or ISO)'),
    end: z.string().describe('End date (YYYY-MM-DD or ISO)'),
    notes: z.string().optional().describe('OOO notes/reason'),
    toUserId: z.coerce.number().optional().describe('Redirect bookings to this user ID'),
  }),
  cliMappings: {
    options: [
      { field: 'start', flags: '--start <date>', description: 'Start date (required)' },
      { field: 'end', flags: '--end <date>', description: 'End date (required)' },
      { field: 'notes', flags: '--notes <text>', description: 'Notes/reason' },
      { field: 'toUserId', flags: '--to-user-id <id>', description: 'Redirect to user ID' },
    ],
  },
  endpoint: { method: 'POST', path: '/out-of-office' },
  fieldMappings: { start: 'body', end: 'body', notes: 'body', toUserId: 'body' },
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
    start: z.string().optional().describe('Start date'),
    end: z.string().optional().describe('End date'),
    notes: z.string().optional().describe('Notes/reason'),
    toUserId: z.coerce.number().optional().describe('Redirect to user ID'),
  }),
  cliMappings: {
    args: [{ field: 'entryId', name: 'entryId', required: true }],
    options: [
      { field: 'start', flags: '--start <date>', description: 'Start date' },
      { field: 'end', flags: '--end <date>', description: 'End date' },
      { field: 'notes', flags: '--notes <text>', description: 'Notes/reason' },
      { field: 'toUserId', flags: '--to-user-id <id>', description: 'Redirect to user ID' },
    ],
  },
  endpoint: { method: 'PATCH', path: '/out-of-office/{entryId}' },
  fieldMappings: { entryId: 'path', start: 'body', end: 'body', notes: 'body', toUserId: 'body' },
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
  endpoint: { method: 'DELETE', path: '/out-of-office/{entryId}' },
  fieldMappings: { entryId: 'path' },
  handler: (input, client) => executeCommand(oooDeleteCommand, input, client),
};

export const outOfOfficeCommands: CommandDefinition[] = [
  oooListCommand,
  oooCreateCommand,
  oooUpdateCommand,
  oooDeleteCommand,
];
