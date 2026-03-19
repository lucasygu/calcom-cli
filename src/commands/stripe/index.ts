import { z } from 'zod';
import { executeCommand } from '../../core/handler.js';
import type { CommandDefinition } from '../../core/types.js';

export const stripeCheckCommand: CommandDefinition = {
  name: 'stripe_check',
  group: 'stripe',
  subcommand: 'check',
  description: 'Check if Stripe is connected for the authenticated user',
  examples: ['calcom stripe check'],
  inputSchema: z.object({}),
  cliMappings: {},
  endpoint: { method: 'GET', path: '/stripe/check' },
  fieldMappings: {},
  handler: (input, client) => executeCommand(stripeCheckCommand, input, client),
};

export const stripeConnectCommand: CommandDefinition = {
  name: 'stripe_connect',
  group: 'stripe',
  subcommand: 'connect',
  description: 'Get the Stripe Connect authorization URL',
  examples: ['calcom stripe connect'],
  inputSchema: z.object({}),
  cliMappings: {},
  endpoint: { method: 'GET', path: '/stripe/connect' },
  fieldMappings: {},
  handler: (input, client) => executeCommand(stripeConnectCommand, input, client),
};

export const stripeSaveCredentialsCommand: CommandDefinition = {
  name: 'stripe_save_credentials',
  group: 'stripe',
  subcommand: 'save-credentials',
  description: 'Save Stripe credentials (typically after OAuth callback)',
  examples: ['calcom stripe save-credentials --code "auth_code_here"'],
  inputSchema: z.object({
    code: z.string().describe('Stripe authorization code from OAuth callback'),
    state: z.string().optional().describe('OAuth state parameter'),
  }),
  cliMappings: {
    options: [
      { field: 'code', flags: '--code <code>', description: 'Authorization code (required)' },
      { field: 'state', flags: '--state <state>', description: 'OAuth state' },
    ],
  },
  endpoint: { method: 'POST', path: '/stripe/credentials' },
  fieldMappings: { code: 'body', state: 'body' },
  handler: (input, client) => executeCommand(stripeSaveCredentialsCommand, input, client),
};

export const stripeCommands: CommandDefinition[] = [
  stripeCheckCommand,
  stripeConnectCommand,
  stripeSaveCredentialsCommand,
];
