import { z } from 'zod';
import { executeCommand } from '../../core/handler.js';
import type { CommandDefinition } from '../../core/types.js';

export const teamsListCommand: CommandDefinition = {
  name: 'teams_list',
  group: 'teams',
  subcommand: 'list',
  description: 'List all teams the authenticated user belongs to',
  examples: ['calcom teams list'],
  inputSchema: z.object({}),
  cliMappings: {},
  endpoint: { method: 'GET', path: '/teams' },
  fieldMappings: {},
  handler: (input, client) => executeCommand(teamsListCommand, input, client),
};

export const teamsGetCommand: CommandDefinition = {
  name: 'teams_get',
  group: 'teams',
  subcommand: 'get',
  description: 'Get a specific team by ID',
  examples: ['calcom teams get 123'],
  inputSchema: z.object({
    teamId: z.coerce.number().describe('Team ID'),
  }),
  cliMappings: {
    args: [{ field: 'teamId', name: 'teamId', required: true }],
  },
  endpoint: { method: 'GET', path: '/teams/{teamId}' },
  fieldMappings: { teamId: 'path' },
  handler: (input, client) => executeCommand(teamsGetCommand, input, client),
};

export const teamsCreateCommand: CommandDefinition = {
  name: 'teams_create',
  group: 'teams',
  subcommand: 'create',
  description: 'Create a new team',
  examples: ['calcom teams create --name "Sales Team" --slug sales'],
  inputSchema: z.object({
    name: z.string().describe('Team name'),
    slug: z.string().optional().describe('Team URL slug'),
    logoUrl: z.string().optional().describe('Team logo URL'),
    calVideoLogo: z.string().optional().describe('Cal Video logo URL'),
    appLogo: z.string().optional().describe('App logo URL'),
    appIconLogo: z.string().optional().describe('App icon logo URL'),
    bio: z.string().optional().describe('Team bio'),
    hideBranding: z.boolean().optional().describe('Hide Cal.com branding'),
    isPrivate: z.boolean().optional().describe('Make team private'),
    hideBookATeamMember: z.boolean().optional().describe('Hide book-a-team-member option'),
    metadata: z.string().optional().describe('JSON metadata'),
    theme: z.string().optional().describe('Theme: light or dark'),
    brandColor: z.string().optional().describe('Brand color hex'),
    darkBrandColor: z.string().optional().describe('Dark mode brand color hex'),
    bannerUrl: z.string().optional().describe('Banner image URL'),
    timeFormat: z.coerce.number().optional().describe('Time format: 12 or 24'),
    timeZone: z.string().optional().describe('Team timezone'),
    weekStart: z.string().optional().describe('Week start day'),
  }),
  cliMappings: {
    options: [
      { field: 'name', flags: '--name <name>', description: 'Team name (required)' },
      { field: 'slug', flags: '--slug <slug>', description: 'URL slug' },
      { field: 'bio', flags: '--bio <text>', description: 'Team bio' },
      { field: 'hideBranding', flags: '--hide-branding', description: 'Hide branding' },
      { field: 'isPrivate', flags: '--private', description: 'Make private' },
      { field: 'timeZone', flags: '--timezone <tz>', description: 'Timezone' },
      { field: 'timeFormat', flags: '--time-format <fmt>', description: '12 or 24' },
      { field: 'weekStart', flags: '--week-start <day>', description: 'Week start day' },
    ],
  },
  endpoint: { method: 'POST', path: '/teams' },
  fieldMappings: {
    name: 'body', slug: 'body', logoUrl: 'body', calVideoLogo: 'body',
    appLogo: 'body', appIconLogo: 'body', bio: 'body', hideBranding: 'body',
    isPrivate: 'body', hideBookATeamMember: 'body', theme: 'body',
    brandColor: 'body', darkBrandColor: 'body', bannerUrl: 'body',
    timeFormat: 'body', timeZone: 'body', weekStart: 'body',
  },
  handler: async (input, client) => {
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined && k !== 'metadata') body[k] = v;
    }
    if (input.metadata) {
      try { body.metadata = JSON.parse(input.metadata); } catch { /* skip */ }
    }
    return client.post('/teams', body);
  },
};

export const teamsUpdateCommand: CommandDefinition = {
  name: 'teams_update',
  group: 'teams',
  subcommand: 'update',
  description: 'Update a team',
  examples: ['calcom teams update 123 --name "Updated Team Name"'],
  inputSchema: z.object({
    teamId: z.coerce.number().describe('Team ID'),
    name: z.string().optional().describe('Team name'),
    slug: z.string().optional().describe('URL slug'),
    bio: z.string().optional().describe('Team bio'),
    hideBranding: z.boolean().optional().describe('Hide branding'),
    isPrivate: z.boolean().optional().describe('Make private'),
    timeZone: z.string().optional().describe('Timezone'),
    timeFormat: z.coerce.number().optional().describe('12 or 24'),
    weekStart: z.string().optional().describe('Week start day'),
  }),
  cliMappings: {
    args: [{ field: 'teamId', name: 'teamId', required: true }],
    options: [
      { field: 'name', flags: '--name <name>', description: 'Team name' },
      { field: 'slug', flags: '--slug <slug>', description: 'URL slug' },
      { field: 'bio', flags: '--bio <text>', description: 'Team bio' },
      { field: 'hideBranding', flags: '--hide-branding', description: 'Hide branding' },
      { field: 'isPrivate', flags: '--private', description: 'Make private' },
      { field: 'timeZone', flags: '--timezone <tz>', description: 'Timezone' },
      { field: 'timeFormat', flags: '--time-format <fmt>', description: '12 or 24' },
      { field: 'weekStart', flags: '--week-start <day>', description: 'Week start day' },
    ],
  },
  endpoint: { method: 'PATCH', path: '/teams/{teamId}' },
  fieldMappings: {
    teamId: 'path', name: 'body', slug: 'body', bio: 'body',
    hideBranding: 'body', isPrivate: 'body', timeZone: 'body',
    timeFormat: 'body', weekStart: 'body',
  },
  handler: (input, client) => executeCommand(teamsUpdateCommand, input, client),
};

export const teamsDeleteCommand: CommandDefinition = {
  name: 'teams_delete',
  group: 'teams',
  subcommand: 'delete',
  description: 'Delete a team by ID',
  examples: ['calcom teams delete 123'],
  inputSchema: z.object({
    teamId: z.coerce.number().describe('Team ID'),
  }),
  cliMappings: {
    args: [{ field: 'teamId', name: 'teamId', required: true }],
  },
  endpoint: { method: 'DELETE', path: '/teams/{teamId}' },
  fieldMappings: { teamId: 'path' },
  handler: (input, client) => executeCommand(teamsDeleteCommand, input, client),
};

export const teamsCommands: CommandDefinition[] = [
  teamsListCommand,
  teamsGetCommand,
  teamsCreateCommand,
  teamsUpdateCommand,
  teamsDeleteCommand,
];
