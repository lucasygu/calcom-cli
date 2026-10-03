import { z } from 'zod';
import { executeCommand } from '../../core/handler.js';
import type { CommandDefinition } from '../../core/types.js';

export const destinationCalendarsUpdateCommand: CommandDefinition = {
  name: 'destination_calendars_update',
  group: 'destination-calendars',
  subcommand: 'update',
  description: 'Update the destination calendar (where new bookings are created)',
  examples: ['calcom destination-calendars update --integration "google_calendar" --external-id "primary"'],
  inputSchema: z.object({
    integration: z
      .enum(['apple_calendar', 'google_calendar', 'office365_calendar'])
      .describe('apple_calendar, google_calendar or office365_calendar (as `calendars list` shows)'),
    externalId: z.string().describe('External calendar ID, as `calendars list` shows (e.g. the calendar email)'),
    delegationCredentialId: z.string().optional().describe('Delegation credential ID, for delegated calendars'),
  }),
  cliMappings: {
    options: [
      { field: 'integration', flags: '--integration <type>', description: 'Integration type (required)' },
      { field: 'externalId', flags: '--external-id <id>', description: 'External calendar ID (required)' },
      { field: 'delegationCredentialId', flags: '--delegation-credential-id <id>', description: 'Delegation credential ID' },
    ],
  },
  // PUT, not PATCH (PATCH 404s). There is no per-event-type destination on this route.
  endpoint: { method: 'PUT', path: '/destination-calendars' },
  fieldMappings: { integration: 'body', externalId: 'body', delegationCredentialId: 'body' },
  handler: (input, client) => executeCommand(destinationCalendarsUpdateCommand, input, client),
};

export const destinationCalendarsCommands: CommandDefinition[] = [
  destinationCalendarsUpdateCommand,
];
