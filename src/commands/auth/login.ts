import type { Command } from 'commander';
import { CalcomClient } from '../../core/client.js';
import { saveConfig, loadConfig } from '../../core/config.js';

export function registerLoginCommand(program: Command): void {
  program
    .command('login')
    .description('Authenticate with your Cal.com API key')
    .action(async (_opts, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      let apiKey = globalOpts.apiKey as string | undefined;

      if (!apiKey) {
        // Check env var
        if (process.env.CAL_API_KEY) {
          apiKey = process.env.CAL_API_KEY;
        } else {
          try {
            const { password } = await import('@inquirer/prompts');
            apiKey = await password({
              message: 'Paste your Cal.com API key (cal_live_xxxx):',
              mask: '*',
            });
          } catch {
            console.error(
              'Interactive prompts not available. Use:\n  CAL_API_KEY=<key> calcom login\n  or: calcom --api-key <key> login',
            );
            process.exit(1);
          }
        }
      }

      if (!apiKey?.trim()) {
        console.error('API key cannot be empty.');
        process.exit(1);
      }

      console.error('Validating API key...');
      const client = new CalcomClient({ apiKey: apiKey.trim() });

      let user: any;
      try {
        const res: any = await client.get('/me');
        user = res.data ?? res;
      } catch (err: any) {
        console.error(`Authentication failed: ${err.message}`);
        process.exit(1);
      }

      const existing = await loadConfig();
      await saveConfig({
        ...existing,
        apiKey: apiKey.trim(),
        user_id: user.id,
        user_name: user.name,
        user_email: user.email,
        username: user.username,
        time_zone: user.timeZone,
      });

      console.log(
        JSON.stringify(
          {
            status: 'authenticated',
            name: user.name,
            email: user.email,
            username: user.username,
            id: user.id,
          },
          null,
          2,
        ),
      );
    });
}
