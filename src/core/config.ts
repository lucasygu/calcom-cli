import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONFIG_DIR = join(homedir(), '.calcom-cli');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface CalcomConfig {
  apiKey?: string;
  user_id?: number;
  user_name?: string;
  user_email?: string;
  username?: string;
  time_zone?: string;
}

export async function loadConfig(): Promise<CalcomConfig> {
  try {
    const raw = await readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(raw) as CalcomConfig;
  } catch {
    return {};
  }
}

export async function saveConfig(config: CalcomConfig): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
  }
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export async function clearConfig(): Promise<void> {
  await saveConfig({});
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}
