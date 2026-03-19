import { z } from 'zod';
import { executeCommand } from '../../core/handler.js';
import type { CommandDefinition } from '../../core/types.js';

export const profileMeCommand: CommandDefinition = {
  name: 'profile_me',
  group: 'profile',
  subcommand: 'me',
  description: 'Get the authenticated user profile',
  examples: ['calcom profile me', 'calcom profile me --pretty'],
  inputSchema: z.object({}),
  cliMappings: {},
  endpoint: { method: 'GET', path: '/me' },
  fieldMappings: {},
  handler: (input, client) => executeCommand(profileMeCommand, input, client),
};

export const profileUpdateCommand: CommandDefinition = {
  name: 'profile_update',
  group: 'profile',
  subcommand: 'update',
  description: 'Update the authenticated user profile',
  examples: ['calcom profile update --name "John Doe" --timezone America/New_York'],
  inputSchema: z.object({
    name: z.string().optional().describe('Display name'),
    bio: z.string().optional().describe('User bio'),
    timeZone: z.string().optional().describe('Timezone'),
    weekStart: z.string().optional().describe('Week start day: Sunday, Monday, etc.'),
    timeFormat: z.coerce.number().optional().describe('Time format: 12 or 24'),
    defaultScheduleId: z.coerce.number().optional().describe('Default schedule ID'),
  }),
  cliMappings: {
    options: [
      { field: 'name', flags: '--name <name>', description: 'Display name' },
      { field: 'bio', flags: '--bio <text>', description: 'User bio' },
      { field: 'timeZone', flags: '--timezone <tz>', description: 'Timezone' },
      { field: 'weekStart', flags: '--week-start <day>', description: 'Week start day' },
      { field: 'timeFormat', flags: '--time-format <fmt>', description: '12 or 24' },
      { field: 'defaultScheduleId', flags: '--default-schedule-id <id>', description: 'Default schedule ID' },
    ],
  },
  endpoint: { method: 'PATCH', path: '/me' },
  fieldMappings: {
    name: 'body',
    bio: 'body',
    timeZone: 'body',
    weekStart: 'body',
    timeFormat: 'body',
    defaultScheduleId: 'body',
  },
  handler: (input, client) => executeCommand(profileUpdateCommand, input, client),
};

export const profileCommands: CommandDefinition[] = [
  profileMeCommand,
  profileUpdateCommand,
];
