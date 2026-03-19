import { z } from 'zod';
import { executeCommand } from '../../core/handler.js';
import type { CommandDefinition } from '../../core/types.js';

export const webhooksListCommand: CommandDefinition = {
  name: 'webhooks_list',
  group: 'webhooks',
  subcommand: 'list',
  description: 'List all webhooks for the authenticated user',
  examples: ['calcom webhooks list'],
  inputSchema: z.object({}),
  cliMappings: {},
  endpoint: { method: 'GET', path: '/webhooks' },
  fieldMappings: {},
  handler: (input, client) => executeCommand(webhooksListCommand, input, client),
};

export const webhooksGetCommand: CommandDefinition = {
  name: 'webhooks_get',
  group: 'webhooks',
  subcommand: 'get',
  description: 'Get a specific webhook by ID',
  examples: ['calcom webhooks get abc123'],
  inputSchema: z.object({
    webhookId: z.string().describe('Webhook ID'),
  }),
  cliMappings: {
    args: [{ field: 'webhookId', name: 'webhookId', required: true }],
  },
  endpoint: { method: 'GET', path: '/webhooks/{webhookId}' },
  fieldMappings: { webhookId: 'path' },
  handler: (input, client) => executeCommand(webhooksGetCommand, input, client),
};

export const webhooksCreateCommand: CommandDefinition = {
  name: 'webhooks_create',
  group: 'webhooks',
  subcommand: 'create',
  description: 'Create a new webhook subscription',
  examples: [
    'calcom webhooks create --subscriber-url "https://example.com/webhook" --triggers BOOKING_CREATED,BOOKING_CANCELLED',
  ],
  inputSchema: z.object({
    subscriberUrl: z.string().describe('Webhook endpoint URL'),
    triggers: z.string().describe('Comma-separated trigger events (e.g. BOOKING_CREATED,BOOKING_CANCELLED)'),
    active: z.boolean().optional().describe('Whether webhook is active (default: true)'),
    payloadTemplate: z.string().optional().describe('Custom payload template'),
    secret: z.string().optional().describe('Webhook signing secret'),
  }),
  cliMappings: {
    options: [
      { field: 'subscriberUrl', flags: '--subscriber-url <url>', description: 'Endpoint URL (required)' },
      { field: 'triggers', flags: '--triggers <events>', description: 'Trigger events (required)' },
      { field: 'active', flags: '--active', description: 'Set as active' },
      { field: 'payloadTemplate', flags: '--payload-template <tmpl>', description: 'Payload template' },
      { field: 'secret', flags: '--secret <secret>', description: 'Signing secret' },
    ],
  },
  endpoint: { method: 'POST', path: '/webhooks' },
  fieldMappings: {},
  handler: async (input, client) => {
    const body: Record<string, unknown> = {
      subscriberUrl: input.subscriberUrl,
      triggers: input.triggers.split(',').map((t: string) => t.trim()),
    };
    if (input.active !== undefined) body.active = input.active;
    if (input.payloadTemplate) body.payloadTemplate = input.payloadTemplate;
    if (input.secret) body.secret = input.secret;
    return client.post('/webhooks', body);
  },
};

export const webhooksUpdateCommand: CommandDefinition = {
  name: 'webhooks_update',
  group: 'webhooks',
  subcommand: 'update',
  description: 'Update an existing webhook',
  examples: ['calcom webhooks update abc123 --active --triggers BOOKING_CREATED'],
  inputSchema: z.object({
    webhookId: z.string().describe('Webhook ID'),
    subscriberUrl: z.string().optional().describe('Webhook endpoint URL'),
    triggers: z.string().optional().describe('Comma-separated trigger events'),
    active: z.boolean().optional().describe('Whether webhook is active'),
    payloadTemplate: z.string().optional().describe('Custom payload template'),
    secret: z.string().optional().describe('Webhook signing secret'),
  }),
  cliMappings: {
    args: [{ field: 'webhookId', name: 'webhookId', required: true }],
    options: [
      { field: 'subscriberUrl', flags: '--subscriber-url <url>', description: 'Endpoint URL' },
      { field: 'triggers', flags: '--triggers <events>', description: 'Trigger events' },
      { field: 'active', flags: '--active', description: 'Set as active' },
      { field: 'payloadTemplate', flags: '--payload-template <tmpl>', description: 'Payload template' },
      { field: 'secret', flags: '--secret <secret>', description: 'Signing secret' },
    ],
  },
  endpoint: { method: 'PATCH', path: '/webhooks/{webhookId}' },
  fieldMappings: { webhookId: 'path' },
  handler: async (input, client) => {
    const body: Record<string, unknown> = {};
    if (input.subscriberUrl) body.subscriberUrl = input.subscriberUrl;
    if (input.triggers) body.triggers = input.triggers.split(',').map((t: string) => t.trim());
    if (input.active !== undefined) body.active = input.active;
    if (input.payloadTemplate) body.payloadTemplate = input.payloadTemplate;
    if (input.secret) body.secret = input.secret;
    const path = `/webhooks/${encodeURIComponent(input.webhookId)}`;
    return client.patch(path, body);
  },
};

export const webhooksDeleteCommand: CommandDefinition = {
  name: 'webhooks_delete',
  group: 'webhooks',
  subcommand: 'delete',
  description: 'Delete a webhook by ID',
  examples: ['calcom webhooks delete abc123'],
  inputSchema: z.object({
    webhookId: z.string().describe('Webhook ID'),
  }),
  cliMappings: {
    args: [{ field: 'webhookId', name: 'webhookId', required: true }],
  },
  endpoint: { method: 'DELETE', path: '/webhooks/{webhookId}' },
  fieldMappings: { webhookId: 'path' },
  handler: (input, client) => executeCommand(webhooksDeleteCommand, input, client),
};

export const webhooksCommands: CommandDefinition[] = [
  webhooksListCommand,
  webhooksGetCommand,
  webhooksCreateCommand,
  webhooksUpdateCommand,
  webhooksDeleteCommand,
];
