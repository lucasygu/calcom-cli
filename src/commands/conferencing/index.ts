import { z } from 'zod';
import { executeCommand } from '../../core/handler.js';
import type { CommandDefinition } from '../../core/types.js';

export const conferencingListCommand: CommandDefinition = {
  name: 'conferencing_list',
  group: 'conferencing',
  subcommand: 'list',
  description: 'List all connected conferencing apps',
  examples: ['calcom conferencing list'],
  inputSchema: z.object({}),
  cliMappings: {},
  endpoint: { method: 'GET', path: '/conferencing' },
  fieldMappings: {},
  handler: (input, client) => executeCommand(conferencingListCommand, input, client),
};

export const conferencingDefaultCommand: CommandDefinition = {
  name: 'conferencing_default',
  group: 'conferencing',
  subcommand: 'default',
  description: 'Get the default conferencing app',
  examples: ['calcom conferencing default'],
  inputSchema: z.object({}),
  cliMappings: {},
  endpoint: { method: 'GET', path: '/conferencing/default' },
  fieldMappings: {},
  handler: (input, client) => executeCommand(conferencingDefaultCommand, input, client),
};

export const conferencingSetDefaultCommand: CommandDefinition = {
  name: 'conferencing_set_default',
  group: 'conferencing',
  subcommand: 'set-default',
  description: 'Set the default conferencing app',
  examples: ['calcom conferencing set-default --app-slug "google-meet"'],
  inputSchema: z.object({
    appSlug: z.string().describe('App slug to set as default (google-meet, zoom or msteams)'),
  }),
  cliMappings: {
    options: [
      { field: 'appSlug', flags: '--app-slug <slug>', description: 'App slug (required)' },
    ],
  },
  endpoint: { method: 'POST', path: '/conferencing/{appSlug}/default' },
  fieldMappings: { appSlug: 'path' },
  handler: (input, client) => executeCommand(conferencingSetDefaultCommand, input, client),
};

export const conferencingConnectCommand: CommandDefinition = {
  name: 'conferencing_connect',
  group: 'conferencing',
  subcommand: 'connect',
  description: 'Connect a conferencing app that needs no OAuth (google-meet); zoom and msteams connect through the web app',
  examples: ['calcom conferencing connect --app-slug google-meet'],
  inputSchema: z.object({
    appSlug: z.string().describe('App slug to connect'),
  }),
  cliMappings: {
    options: [
      { field: 'appSlug', flags: '--app-slug <slug>', description: 'App slug (required)' },
    ],
  },
  endpoint: { method: 'POST', path: '/conferencing/{appSlug}/connect' },
  fieldMappings: { appSlug: 'path' },
  handler: (input, client) => executeCommand(conferencingConnectCommand, input, client),
};

export const conferencingDisconnectCommand: CommandDefinition = {
  name: 'conferencing_disconnect',
  group: 'conferencing',
  subcommand: 'disconnect',
  description: 'Disconnect a conferencing app',
  examples: ['calcom conferencing disconnect --app-slug "zoom"'],
  inputSchema: z.object({
    appSlug: z.string().describe('App slug to disconnect'),
  }),
  cliMappings: {
    options: [
      { field: 'appSlug', flags: '--app-slug <slug>', description: 'App slug (required)' },
    ],
  },
  endpoint: { method: 'DELETE', path: '/conferencing/{appSlug}/disconnect' },
  fieldMappings: { appSlug: 'path' },
  handler: (input, client) => executeCommand(conferencingDisconnectCommand, input, client),
};

export const conferencingCommands: CommandDefinition[] = [
  conferencingListCommand,
  conferencingDefaultCommand,
  conferencingSetDefaultCommand,
  conferencingConnectCommand,
  conferencingDisconnectCommand,
];
