import { z } from 'zod';
import { executeCommand } from '../../core/handler.js';
import type { CommandDefinition } from '../../core/types.js';

export const schedulesListCommand: CommandDefinition = {
  name: 'schedules_list',
  group: 'schedules',
  subcommand: 'list',
  description: 'List all schedules for the authenticated user',
  examples: ['calcom schedules list'],
  inputSchema: z.object({}),
  cliMappings: {},
  endpoint: { method: 'GET', path: '/schedules' },
  fieldMappings: {},
  handler: (input, client) => executeCommand(schedulesListCommand, input, client),
};

export const schedulesGetCommand: CommandDefinition = {
  name: 'schedules_get',
  group: 'schedules',
  subcommand: 'get',
  description: 'Get a specific schedule by ID',
  examples: ['calcom schedules get 123'],
  inputSchema: z.object({
    scheduleId: z.coerce.number().describe('Schedule ID'),
  }),
  cliMappings: {
    args: [{ field: 'scheduleId', name: 'scheduleId', required: true }],
  },
  endpoint: { method: 'GET', path: '/schedules/{scheduleId}' },
  fieldMappings: { scheduleId: 'path' },
  handler: (input, client) => executeCommand(schedulesGetCommand, input, client),
};

export const schedulesDefaultCommand: CommandDefinition = {
  name: 'schedules_default',
  group: 'schedules',
  subcommand: 'default',
  description: 'Get the default schedule for the authenticated user',
  examples: ['calcom schedules default'],
  inputSchema: z.object({}),
  cliMappings: {},
  endpoint: { method: 'GET', path: '/schedules/default' },
  fieldMappings: {},
  handler: (input, client) => executeCommand(schedulesDefaultCommand, input, client),
};

export const schedulesCreateCommand: CommandDefinition = {
  name: 'schedules_create',
  group: 'schedules',
  subcommand: 'create',
  description: 'Create a new availability schedule',
  examples: ['calcom schedules create --name "Work Hours" --timezone America/New_York'],
  inputSchema: z.object({
    name: z.string().describe('Schedule name'),
    timeZone: z.string().describe('Timezone (e.g. America/New_York)'),
    isDefault: z.boolean().optional().describe('Set as default schedule'),
    availability: z.string().optional().describe('JSON array of availability rules'),
  }),
  cliMappings: {
    options: [
      { field: 'name', flags: '--name <name>', description: 'Schedule name (required)' },
      { field: 'timeZone', flags: '--timezone <tz>', description: 'Timezone (required)' },
      { field: 'isDefault', flags: '--default', description: 'Set as default schedule' },
      { field: 'availability', flags: '--availability <json>', description: 'Availability rules JSON' },
    ],
  },
  endpoint: { method: 'POST', path: '/schedules' },
  fieldMappings: { name: 'body', timeZone: 'body', isDefault: 'body' },
  handler: async (input, client) => {
    const body: Record<string, unknown> = {
      name: input.name,
      timeZone: input.timeZone,
    };
    if (input.isDefault !== undefined) body.isDefault = input.isDefault;
    if (input.availability) {
      try { body.availability = JSON.parse(input.availability); } catch { /* skip */ }
    }
    return client.post('/schedules', body);
  },
};

export const schedulesUpdateCommand: CommandDefinition = {
  name: 'schedules_update',
  group: 'schedules',
  subcommand: 'update',
  description: 'Update an existing schedule',
  examples: ['calcom schedules update 123 --name "Updated Hours"'],
  inputSchema: z.object({
    scheduleId: z.coerce.number().describe('Schedule ID'),
    name: z.string().optional().describe('Schedule name'),
    timeZone: z.string().optional().describe('Timezone'),
    isDefault: z.boolean().optional().describe('Set as default'),
    availability: z.string().optional().describe('JSON array of availability rules'),
  }),
  cliMappings: {
    args: [{ field: 'scheduleId', name: 'scheduleId', required: true }],
    options: [
      { field: 'name', flags: '--name <name>', description: 'Schedule name' },
      { field: 'timeZone', flags: '--timezone <tz>', description: 'Timezone' },
      { field: 'isDefault', flags: '--default', description: 'Set as default' },
      { field: 'availability', flags: '--availability <json>', description: 'Availability rules JSON' },
    ],
  },
  endpoint: { method: 'PATCH', path: '/schedules/{scheduleId}' },
  fieldMappings: { scheduleId: 'path', name: 'body', timeZone: 'body', isDefault: 'body' },
  handler: async (input, client) => {
    const body: Record<string, unknown> = {};
    if (input.name) body.name = input.name;
    if (input.timeZone) body.timeZone = input.timeZone;
    if (input.isDefault !== undefined) body.isDefault = input.isDefault;
    if (input.availability) {
      try { body.availability = JSON.parse(input.availability); } catch { /* skip */ }
    }
    const path = `/schedules/${encodeURIComponent(input.scheduleId)}`;
    return client.patch(path, body);
  },
};

export const schedulesDeleteCommand: CommandDefinition = {
  name: 'schedules_delete',
  group: 'schedules',
  subcommand: 'delete',
  description: 'Delete a schedule by ID',
  examples: ['calcom schedules delete 123'],
  inputSchema: z.object({
    scheduleId: z.coerce.number().describe('Schedule ID'),
  }),
  cliMappings: {
    args: [{ field: 'scheduleId', name: 'scheduleId', required: true }],
  },
  endpoint: { method: 'DELETE', path: '/schedules/{scheduleId}' },
  fieldMappings: { scheduleId: 'path' },
  handler: (input, client) => executeCommand(schedulesDeleteCommand, input, client),
};

export const schedulesCommands: CommandDefinition[] = [
  schedulesListCommand,
  schedulesGetCommand,
  schedulesDefaultCommand,
  schedulesCreateCommand,
  schedulesUpdateCommand,
  schedulesDeleteCommand,
];
