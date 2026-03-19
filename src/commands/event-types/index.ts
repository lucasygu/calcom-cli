import { z } from 'zod';
import { executeCommand } from '../../core/handler.js';
import type { CommandDefinition } from '../../core/types.js';

export const eventTypesListCommand: CommandDefinition = {
  name: 'event_types_list',
  group: 'event-types',
  subcommand: 'list',
  description: 'List event types for the authenticated user',
  examples: ['calcom event-types list', 'calcom event-types list --pretty'],
  inputSchema: z.object({
    eventSlug: z.string().optional().describe('Filter by event slug'),
    username: z.string().optional().describe('Filter by username'),
    usernames: z.string().optional().describe('Comma-separated usernames'),
    orgSlug: z.string().optional().describe('Organization slug'),
  }),
  cliMappings: {
    options: [
      { field: 'eventSlug', flags: '--event-slug <slug>', description: 'Filter by event slug' },
      { field: 'username', flags: '--username <name>', description: 'Filter by username' },
      { field: 'usernames', flags: '--usernames <names>', description: 'Comma-separated usernames' },
      { field: 'orgSlug', flags: '--org-slug <slug>', description: 'Organization slug' },
    ],
  },
  endpoint: { method: 'GET', path: '/event-types' },
  fieldMappings: {
    eventSlug: 'query',
    username: 'query',
    usernames: 'query',
    orgSlug: 'query',
  },
  handler: (input, client) => executeCommand(eventTypesListCommand, input, client),
};

export const eventTypesGetCommand: CommandDefinition = {
  name: 'event_types_get',
  group: 'event-types',
  subcommand: 'get',
  description: 'Get a specific event type by ID',
  examples: ['calcom event-types get 12345'],
  inputSchema: z.object({
    eventTypeId: z.coerce.number().describe('Event type ID'),
  }),
  cliMappings: {
    args: [{ field: 'eventTypeId', name: 'eventTypeId', required: true }],
  },
  endpoint: { method: 'GET', path: '/event-types/{eventTypeId}' },
  fieldMappings: { eventTypeId: 'path' },
  handler: (input, client) => executeCommand(eventTypesGetCommand, input, client),
};

export const eventTypesCreateCommand: CommandDefinition = {
  name: 'event_types_create',
  group: 'event-types',
  subcommand: 'create',
  description: 'Create a new event type',
  examples: [
    'calcom event-types create --title "30min Meeting" --slug 30min --length 30',
  ],
  inputSchema: z.object({
    title: z.string().describe('Event type title'),
    slug: z.string().describe('URL slug for the event type'),
    lengthInMinutes: z.coerce.number().describe('Duration in minutes'),
    description: z.string().optional().describe('Event description'),
    locations: z.string().optional().describe('JSON array of location objects'),
    disableGuests: z.boolean().optional().describe('Disable guest invitations'),
    slotInterval: z.coerce.number().optional().describe('Slot interval in minutes'),
    minimumBookingNotice: z.coerce.number().optional().describe('Minimum notice in minutes'),
    beforeEventBuffer: z.coerce.number().optional().describe('Buffer before event in minutes'),
    afterEventBuffer: z.coerce.number().optional().describe('Buffer after event in minutes'),
    scheduleId: z.coerce.number().optional().describe('Schedule ID to use'),
  }),
  cliMappings: {
    options: [
      { field: 'title', flags: '--title <title>', description: 'Event title (required)' },
      { field: 'slug', flags: '--slug <slug>', description: 'URL slug (required)' },
      { field: 'lengthInMinutes', flags: '--length <minutes>', description: 'Duration in minutes (required)' },
      { field: 'description', flags: '--description <text>', description: 'Description' },
      { field: 'locations', flags: '--locations <json>', description: 'Location JSON array' },
      { field: 'disableGuests', flags: '--disable-guests', description: 'Disable guest invitations' },
      { field: 'slotInterval', flags: '--slot-interval <min>', description: 'Slot interval in minutes' },
      { field: 'minimumBookingNotice', flags: '--min-notice <min>', description: 'Min booking notice (minutes)' },
      { field: 'beforeEventBuffer', flags: '--before-buffer <min>', description: 'Buffer before (minutes)' },
      { field: 'afterEventBuffer', flags: '--after-buffer <min>', description: 'Buffer after (minutes)' },
      { field: 'scheduleId', flags: '--schedule-id <id>', description: 'Schedule ID' },
    ],
  },
  endpoint: { method: 'POST', path: '/event-types' },
  fieldMappings: {
    title: 'body',
    slug: 'body',
    lengthInMinutes: 'body',
    description: 'body',
    disableGuests: 'body',
    slotInterval: 'body',
    minimumBookingNotice: 'body',
    beforeEventBuffer: 'body',
    afterEventBuffer: 'body',
    scheduleId: 'body',
  },
  handler: async (input, client) => {
    const body: Record<string, unknown> = { ...input };
    if (input.locations) {
      try { body.locations = JSON.parse(input.locations); } catch { /* keep as string */ }
    }
    delete body.locations;
    const finalBody: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined) finalBody[k] = v;
    }
    if (input.locations) {
      try { finalBody.locations = JSON.parse(input.locations); } catch { /* skip */ }
    }
    return client.post('/event-types', finalBody);
  },
};

export const eventTypesUpdateCommand: CommandDefinition = {
  name: 'event_types_update',
  group: 'event-types',
  subcommand: 'update',
  description: 'Update an existing event type',
  examples: ['calcom event-types update 12345 --title "Updated Meeting"'],
  inputSchema: z.object({
    eventTypeId: z.coerce.number().describe('Event type ID'),
    title: z.string().optional().describe('Event type title'),
    slug: z.string().optional().describe('URL slug'),
    lengthInMinutes: z.coerce.number().optional().describe('Duration in minutes'),
    description: z.string().optional().describe('Event description'),
    disableGuests: z.boolean().optional().describe('Disable guest invitations'),
    slotInterval: z.coerce.number().optional().describe('Slot interval in minutes'),
    minimumBookingNotice: z.coerce.number().optional().describe('Minimum notice in minutes'),
    beforeEventBuffer: z.coerce.number().optional().describe('Buffer before event in minutes'),
    afterEventBuffer: z.coerce.number().optional().describe('Buffer after event in minutes'),
    scheduleId: z.coerce.number().optional().describe('Schedule ID'),
  }),
  cliMappings: {
    args: [{ field: 'eventTypeId', name: 'eventTypeId', required: true }],
    options: [
      { field: 'title', flags: '--title <title>', description: 'Event title' },
      { field: 'slug', flags: '--slug <slug>', description: 'URL slug' },
      { field: 'lengthInMinutes', flags: '--length <minutes>', description: 'Duration in minutes' },
      { field: 'description', flags: '--description <text>', description: 'Description' },
      { field: 'disableGuests', flags: '--disable-guests', description: 'Disable guests' },
      { field: 'slotInterval', flags: '--slot-interval <min>', description: 'Slot interval' },
      { field: 'minimumBookingNotice', flags: '--min-notice <min>', description: 'Min booking notice' },
      { field: 'beforeEventBuffer', flags: '--before-buffer <min>', description: 'Buffer before' },
      { field: 'afterEventBuffer', flags: '--after-buffer <min>', description: 'Buffer after' },
      { field: 'scheduleId', flags: '--schedule-id <id>', description: 'Schedule ID' },
    ],
  },
  endpoint: { method: 'PATCH', path: '/event-types/{eventTypeId}' },
  fieldMappings: {
    eventTypeId: 'path',
    title: 'body',
    slug: 'body',
    lengthInMinutes: 'body',
    description: 'body',
    disableGuests: 'body',
    slotInterval: 'body',
    minimumBookingNotice: 'body',
    beforeEventBuffer: 'body',
    afterEventBuffer: 'body',
    scheduleId: 'body',
  },
  handler: (input, client) => executeCommand(eventTypesUpdateCommand, input, client),
};

export const eventTypesDeleteCommand: CommandDefinition = {
  name: 'event_types_delete',
  group: 'event-types',
  subcommand: 'delete',
  description: 'Delete an event type by ID',
  examples: ['calcom event-types delete 12345'],
  inputSchema: z.object({
    eventTypeId: z.coerce.number().describe('Event type ID'),
  }),
  cliMappings: {
    args: [{ field: 'eventTypeId', name: 'eventTypeId', required: true }],
  },
  endpoint: { method: 'DELETE', path: '/event-types/{eventTypeId}' },
  fieldMappings: { eventTypeId: 'path' },
  handler: (input, client) => executeCommand(eventTypesDeleteCommand, input, client),
};

export const eventTypesCommands: CommandDefinition[] = [
  eventTypesListCommand,
  eventTypesGetCommand,
  eventTypesCreateCommand,
  eventTypesUpdateCommand,
  eventTypesDeleteCommand,
];
