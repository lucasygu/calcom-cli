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
    integration: z.string().describe('Integration type (e.g. google_calendar, office365_calendar)'),
    externalId: z.string().describe('External calendar ID (e.g. primary, calendar email)'),
    eventTypeId: z.coerce.number().optional().describe('Event type ID to set destination for'),
    bookingLimitsOverride: z.string().optional().describe('JSON override for booking limits'),
  }),
  cliMappings: {
    options: [
      { field: 'integration', flags: '--integration <type>', description: 'Integration type (required)' },
      { field: 'externalId', flags: '--external-id <id>', description: 'External calendar ID (required)' },
      { field: 'eventTypeId', flags: '--event-type-id <id>', description: 'Event type ID' },
    ],
  },
  endpoint: { method: 'PATCH', path: '/destination-calendars' },
  fieldMappings: { integration: 'body', externalId: 'body', eventTypeId: 'body' },
  handler: (input, client) => executeCommand(destinationCalendarsUpdateCommand, input, client),
};

export const destinationCalendarsCommands: CommandDefinition[] = [
  destinationCalendarsUpdateCommand,
];
