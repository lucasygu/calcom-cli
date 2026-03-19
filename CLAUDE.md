# calcom-cli

CLI and MCP server for the Cal.com API v2.

## Quick Reference

- **Build:** `npm run build`
- **Dev CLI:** `npm run dev -- <command>`
- **Dev MCP:** `npm run dev:mcp`
- **Type check:** `npm run typecheck`

## Architecture

Single `CommandDefinition` as source of truth — shared by CLI (Commander.js) and MCP server.

- `src/core/` — types, client, auth, config, handler, output, errors
- `src/commands/<group>/index.ts` — command definitions per API resource
- `src/commands/index.ts` — registry + CLI registration
- `src/mcp/server.ts` — MCP tool registration from allCommands

## Adding a Command

1. Add `CommandDefinition` in `src/commands/<group>/index.ts`
2. Export from the group's `*Commands` array
3. Import in `src/commands/index.ts` → `allCommands`
4. Build and test: `npm run dev -- <group> <subcommand>`

## API

- Base URL: `https://api.cal.com/v2`
- Auth: `Authorization: Bearer cal_live_xxxx`
- Version header: `cal-api-version: 2024-08-13`
- Rate limit: 120 req/min
