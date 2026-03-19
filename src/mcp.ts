import { startMcpServer } from './mcp/server.js';

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

startMcpServer().catch((error) => {
  console.error('Failed to start Cal.com MCP server:', error?.message ?? error);
  process.exit(1);
});
