import { Command } from 'commander';
import { createRequire } from 'node:module';
import { registerAllCommands } from './commands/index.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const program = new Command();

program
  .name('calcom')
  .description('Agent-native CLI and MCP server for the Cal.com API v2')
  .version(version)
  .option('--api-key <key>', 'Cal.com API key (overrides env/config)')
  .option('--pretty', 'Pretty-print JSON output')
  .option('--quiet', 'Suppress output (exit code only)')
  .option('--fields <fields>', 'Comma-separated fields to include in output');

registerAllCommands(program);

program.parse(process.argv);
