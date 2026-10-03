import type { z } from 'zod';
import type { CalcomClient } from './client.js';

export interface CliArgMapping {
  field: string;
  name: string;
  required?: boolean;
}

export interface CliOptionMapping {
  field: string;
  flags: string;
  description?: string;
}

export interface CliMapping {
  args?: CliArgMapping[];
  options?: CliOptionMapping[];
}

export interface CommandDefinition<TInput extends z.ZodObject<any> = z.ZodObject<any>> {
  name: string;
  group: string;
  subcommand: string;
  description: string;
  examples?: string[];
  inputSchema: TInput;
  cliMappings: CliMapping;
  endpoint: { method: string; path: string };
  fieldMappings: Record<string, 'path' | 'query' | 'body'>;
  paginated?: boolean;
  /**
   * 'optional': the command also works without an API key (it calls Cal.com's
   * public endpoints, the way a booking page does) and degrades the parts that
   * need auth. Default is 'required'.
   */
  auth?: 'required' | 'optional';
  handler: (input: z.infer<TInput>, client: CalcomClient) => Promise<unknown>;
}

export interface GlobalOptions {
  apiKey?: string;
  output?: string;
  pretty?: boolean;
  quiet?: boolean;
  fields?: string;
}
