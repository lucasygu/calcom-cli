import { loadConfig } from './config.js';
import { AuthError } from './errors.js';

/**
 * Resolve the Cal.com API key in priority order:
 * 1. --api-key CLI flag
 * 2. CAL_API_KEY env var
 * 3. ~/.calcom-cli/config.json
 */
export async function resolveApiKey(flagApiKey?: string): Promise<string> {
  if (flagApiKey) return flagApiKey;
  if (process.env.CAL_API_KEY) return process.env.CAL_API_KEY;

  const config = await loadConfig();
  if (config.apiKey) return config.apiKey;

  throw new AuthError(
    'No Cal.com API key found.\n\n' +
      'Options:\n' +
      '  1. Run: calcom login\n' +
      '  2. Set env var: export CAL_API_KEY=<key>\n' +
      '  3. Pass flag: calcom --api-key <key> <command>',
  );
}
