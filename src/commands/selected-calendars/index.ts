import { z } from 'zod';
import { executeCommand } from '../../core/handler.js';
import type { CommandDefinition } from '../../core/types.js';

export const selectedCalendarsAddCommand: CommandDefinition = {
  name: 'selected_calendars_add',
  group: 'selected-calendars',
  subcommand: 'add',
  description: 'Add a calendar to check for conflicts (selected calendars)',
  examples: ['calcom selected-calendars add --integration "google_calendar" --external-id "primary" --credential-id 123'],
  inputSchema: z.object({
    integration: z.string().describe('Integration type (e.g. google_calendar)'),
    externalId: z.string().describe('External calendar ID'),
    credentialId: z.coerce.number().describe('Credential ID for the calendar connection'),
  }),
  cliMappings: {
    options: [
      { field: 'integration', flags: '--integration <type>', description: 'Integration type (required)' },
      { field: 'externalId', flags: '--external-id <id>', description: 'External calendar ID (required)' },
      { field: 'credentialId', flags: '--credential-id <id>', description: 'Credential ID (required)' },
    ],
  },
  endpoint: { method: 'POST', path: '/selected-calendars' },
  fieldMappings: { integration: 'body', externalId: 'body', credentialId: 'body' },
  handler: (input, client) => executeCommand(selectedCalendarsAddCommand, input, client),
};

export const selectedCalendarsDeleteCommand: CommandDefinition = {
  name: 'selected_calendars_delete',
  group: 'selected-calendars',
  subcommand: 'delete',
  description: 'Remove a calendar from conflict checking (selected calendars)',
  examples: ['calcom selected-calendars delete --integration "google_calendar" --external-id "primary" --credential-id 123'],
  inputSchema: z.object({
    integration: z.string().describe('Integration type'),
    externalId: z.string().describe('External calendar ID'),
    credentialId: z.coerce.number().describe('Credential ID'),
  }),
  cliMappings: {
    options: [
      { field: 'integration', flags: '--integration <type>', description: 'Integration type (required)' },
      { field: 'externalId', flags: '--external-id <id>', description: 'External calendar ID (required)' },
      { field: 'credentialId', flags: '--credential-id <id>', description: 'Credential ID (required)' },
    ],
  },
  endpoint: { method: 'DELETE', path: '/selected-calendars' },
  fieldMappings: {},
  handler: async (input, client) => {
    return client.delete('/selected-calendars', {
      integration: input.integration,
      externalId: input.externalId,
      credentialId: input.credentialId,
    });
  },
};

export const selectedCalendarsCommands: CommandDefinition[] = [
  selectedCalendarsAddCommand,
  selectedCalendarsDeleteCommand,
];
