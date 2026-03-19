# calcom-cli

[![npm version](https://img.shields.io/npm/v/calcom-cli.svg)](https://www.npmjs.com/package/calcom-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Agent-native CLI and MCP server for the [Cal.com API v2](https://cal.com/docs/api-reference/v2). 61 tools across 14 resource groups — bookings, event types, schedules, availability slots, calendars, webhooks, teams, and more. Built for both human operators and AI agents.

## Why calcom-cli?

- **Dual-mode**: Same command definitions power both the CLI and the MCP server — zero drift between human and agent interfaces
- **61 MCP tools**: Full Cal.com API v2 coverage across bookings, event types, schedules, slots, calendars, webhooks, profile, out-of-office, teams, conferencing, destination calendars, selected calendars, and Stripe
- **Agent-native**: Every tool has Zod-validated input schemas, structured JSON output, and descriptive error messages that LLMs can act on
- **Zero config**: Works with a single `CAL_API_KEY` environment variable — no OAuth flows, no config files required
- **Resilient**: Automatic retry with exponential backoff on rate limits (429) and server errors (5xx), 30s read / 15s write timeouts

## Install

```bash
# From npm (global)
npm install -g calcom-cli

# Or use npx (no install)
npx calcom-cli profile me --pretty

# From source
git clone https://github.com/bcharleson/calcom-cli.git
cd calcom-cli
npm install && npm run build
npm link
```

## Quick Start

```bash
# 1. Authenticate (interactive — saves to ~/.calcom-cli/config.json)
calcom login

# 2. Check your profile
calcom profile me --pretty

# 3. List upcoming bookings
calcom bookings list --status upcoming --pretty

# 4. Find available slots
calcom slots available \
  --event-type-id 123 \
  --start-time "2025-03-20T00:00:00Z" \
  --end-time "2025-03-27T00:00:00Z" --pretty
```

## Authentication

Three ways to authenticate, checked in priority order:

| Priority | Method | Example |
|----------|--------|---------|
| 1 | `--api-key` flag | `calcom --api-key cal_live_xxxx profile me` |
| 2 | `CAL_API_KEY` env var | `export CAL_API_KEY=cal_live_xxxx` |
| 3 | Config file | `calcom login` (saves to `~/.calcom-cli/config.json`) |

Get your API key from [Cal.com Settings > Developer > API Keys](https://app.cal.com/settings/developer/api-keys).

## MCP Server Setup

The MCP server exposes all 61 tools to any MCP-compatible AI client.

### Claude Code

```bash
claude mcp add calcom -- npx calcom-cli mcp
# Or with local install:
claude mcp add calcom -- node /path/to/calcom-cli/dist/mcp.js
```

### Claude Desktop

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "calcom": {
      "command": "npx",
      "args": ["-y", "calcom-cli", "mcp"],
      "env": {
        "CAL_API_KEY": "cal_live_xxxx"
      }
    }
  }
}
```

### Cursor

Add to Cursor MCP settings (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "calcom": {
      "command": "npx",
      "args": ["-y", "calcom-cli", "mcp"],
      "env": {
        "CAL_API_KEY": "cal_live_xxxx"
      }
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "calcom": {
      "command": "npx",
      "args": ["-y", "calcom-cli", "mcp"],
      "env": {
        "CAL_API_KEY": "cal_live_xxxx"
      }
    }
  }
}
```

## Command Reference

### Auth Commands

```bash
calcom login                    # Authenticate with Cal.com API key (interactive)
calcom logout                   # Remove stored credentials
calcom auth-status              # Show current auth status + config path
```

### MCP Server

```bash
calcom mcp                      # Start the MCP server (stdio transport)
```

---

### Bookings (13 commands)

```bash
calcom bookings list [options]                   # List bookings
  --status <status>         # upcoming, recurring, past, cancelled, unconfirmed
  --attendee-email <email>  # Filter by attendee
  --event-type-id <id>      # Filter by event type
  --after-start <iso>       # After this start time
  --before-end <iso>        # Before this end time
  --sort-start <asc|desc>   # Sort by start time
  --take <n>                # Number of results
  --skip <n>                # Offset

calcom bookings get <bookingUid>                 # Get booking details
calcom bookings create [options]                 # Create a booking
  --event-type-id <id>       # (required) Event type ID
  --start <iso>              # (required) Start time
  --attendee-name <name>     # (required) Attendee name
  --attendee-email <email>   # (required) Attendee email
  --attendee-timezone <tz>   # (required) Attendee timezone
  --guests <emails>          # Comma-separated guest emails
  --notes <text>             # Booking notes

calcom bookings cancel <bookingUid> [--reason <text>]
calcom bookings confirm <bookingUid>
calcom bookings decline <bookingUid> [--reason <text>]
calcom bookings reschedule <bookingUid> --start <iso> [--reason <text>]
calcom bookings mark-absence <bookingUid> [--host] [--attendees <emails>]
calcom bookings reassign <bookingUid>
calcom bookings update-location <bookingUid> --type <type> [--link <url>] [--integration <name>]
calcom bookings attendees <bookingUid>
calcom bookings add-attendee <bookingUid> --name <name> --email <email> --timezone <tz>
calcom bookings add-guests <bookingUid> --guests <emails>
```

### Event Types (5 commands)

```bash
calcom event-types list                          # List event types
calcom event-types get <eventTypeId>             # Get event type details
calcom event-types create [options]              # Create event type
  --title <title>            # (required) Event title
  --slug <slug>              # (required) URL slug
  --length <minutes>         # (required) Duration in minutes
  --description <text>       # Description
  --schedule-id <id>         # Schedule to use
  --slot-interval <min>      # Slot interval
  --min-notice <min>         # Minimum booking notice
  --before-buffer <min>      # Buffer before event
  --after-buffer <min>       # Buffer after event

calcom event-types update <eventTypeId> [options]
calcom event-types delete <eventTypeId>
```

### Schedules (6 commands)

```bash
calcom schedules list                            # List all schedules
calcom schedules get <scheduleId>                # Get schedule details
calcom schedules default                         # Get default schedule
calcom schedules create [options]                # Create schedule
  --name <name>              # (required) Schedule name
  --timezone <tz>            # (required) Timezone
  --default                  # Set as default
  --availability <json>      # Availability rules JSON

calcom schedules update <scheduleId> [options]
calcom schedules delete <scheduleId>
```

### Slots (5 commands)

```bash
calcom slots available [options]                 # Get available time slots
  --event-type-id <id>      # (required) Event type ID
  --start-time <iso>        # (required) Range start
  --end-time <iso>          # (required) Range end
  --timezone <tz>           # Timezone for results
  --duration <min>          # Duration override

calcom slots reserve --event-type-id <id> --slot-utc <iso>
calcom slots get-reserved <uid>
calcom slots update-reserved <uid> --slot-utc <iso>
calcom slots delete-reserved <uid>
```

### Calendars (5 commands)

```bash
calcom calendars list                            # List connected calendars
calcom calendars busy --date-from <date> --date-to <date>
calcom calendars check <credentialId>            # Check connection status
calcom calendars save-credentials --type <type> --username <user> --password <pass>
calcom calendars disconnect <credentialId>
```

### Webhooks (5 commands)

```bash
calcom webhooks list                             # List webhooks
calcom webhooks get <webhookId>
calcom webhooks create [options]                 # Create webhook
  --subscriber-url <url>    # (required) Endpoint URL
  --triggers <events>       # (required) e.g. BOOKING_CREATED,BOOKING_CANCELLED
  --secret <secret>         # Signing secret

calcom webhooks update <webhookId> [options]
calcom webhooks delete <webhookId>
```

### Profile (2 commands)

```bash
calcom profile me                                # Get your profile
calcom profile update [options]                  # Update profile
  --name <name>             # Display name
  --timezone <tz>           # Timezone
  --time-format <12|24>     # Time format
  --week-start <day>        # Week start day
  --default-schedule-id <id>
```

### Out of Office (4 commands)

```bash
calcom out-of-office list
calcom out-of-office create --start <date> --end <date> [--notes <text>]
calcom out-of-office update <entryId> [options]
calcom out-of-office delete <entryId>
```

### Teams (5 commands)

```bash
calcom teams list
calcom teams get <teamId>
calcom teams create --name <name> [--slug <slug>] [--timezone <tz>]
calcom teams update <teamId> [options]
calcom teams delete <teamId>
```

### Conferencing (5 commands)

```bash
calcom conferencing list                         # List connected apps
calcom conferencing default                      # Get default app
calcom conferencing set-default --app-slug <slug>
calcom conferencing connect --app-slug <slug>
calcom conferencing disconnect --app-slug <slug>
```

### Destination Calendars (1 command)

```bash
calcom destination-calendars update --integration <type> --external-id <id>
```

### Selected Calendars (2 commands)

```bash
calcom selected-calendars add --integration <type> --external-id <id> --credential-id <id>
calcom selected-calendars delete --integration <type> --external-id <id> --credential-id <id>
```

### Stripe (3 commands)

```bash
calcom stripe check                              # Check Stripe connection
calcom stripe connect                            # Get Stripe Connect URL
calcom stripe save-credentials --code <code>     # Save OAuth credentials
```

## Global Options

| Option | Description |
|--------|-------------|
| `--api-key <key>` | Cal.com API key (overrides env/config) |
| `--pretty` | Pretty-print JSON output |
| `--quiet` | Suppress output (exit code only) |
| `--fields <fields>` | Comma-separated fields to include in output |
| `-V, --version` | Show version |
| `-h, --help` | Show help for any command |

## Output Format

All commands return JSON to stdout. Errors go to stderr.

```bash
# Default — compact JSON
calcom bookings list

# Pretty-printed
calcom bookings list --pretty

# Field filtering
calcom bookings list --fields "uid,startTime,endTime,status" --pretty

# Quiet mode (exit code only, 0 = success, 1 = error)
calcom bookings cancel abc123 --quiet
```

## Architecture

```
src/
├── index.ts                 # CLI entry (Commander.js)
├── mcp.ts                   # MCP entry (stdio transport)
├── core/
│   ├── types.ts             # CommandDefinition — single source of truth
│   ├── client.ts            # CalcomClient (fetch + retry + backoff)
│   ├── auth.ts              # resolveApiKey (flag → env → config)
│   ├── config.ts            # ~/.calcom-cli/config.json (mode 0600)
│   ├── handler.ts           # executeCommand (path/query/body routing)
│   ├── output.ts            # JSON formatting + --fields filtering
│   └── errors.ts            # CalcomError hierarchy
├── commands/
│   ├── index.ts             # allCommands registry + registerAllCommands
│   ├── auth/                # login, logout, status
│   ├── bookings/            # 13 commands
│   ├── event-types/         # 5 commands
│   ├── schedules/           # 6 commands
│   ├── slots/               # 5 commands
│   ├── calendars/           # 5 commands
│   ├── webhooks/            # 5 commands
│   ├── profile/             # 2 commands
│   ├── out-of-office/       # 4 commands
│   ├── teams/               # 5 commands
│   ├── conferencing/        # 5 commands
│   ├── destination-calendars/ # 1 command
│   ├── selected-calendars/  # 2 commands
│   └── stripe/              # 3 commands
└── mcp/
    └── server.ts            # MCP tool registration from allCommands
```

Each command is a `CommandDefinition` object with:
- **name** — MCP tool name (e.g. `bookings_list`)
- **group/subcommand** — CLI routing (e.g. `calcom bookings list`)
- **inputSchema** — Zod schema (shared by CLI validation + MCP tool schema)
- **endpoint** — HTTP method + path template
- **fieldMappings** — routes each field to path, query, or body
- **handler** — executes the API call via CalcomClient

## Config File

Stored at `~/.calcom-cli/config.json` with permissions `0600`:

```json
{
  "apiKey": "cal_live_xxxx",
  "user_id": 12345,
  "user_name": "John Doe",
  "user_email": "john@example.com",
  "username": "johndoe",
  "time_zone": "America/New_York"
}
```

## Cal.com API Details

| Property | Value |
|----------|-------|
| Base URL | `https://api.cal.com/v2` |
| Auth | `Authorization: Bearer cal_live_xxxx` |
| Version Header | `cal-api-version: 2024-08-13` |
| Rate Limit | 120 requests/min |
| Pagination | Offset-based (`take` + `skip`) |
| Key Prefixes | `cal_` (test), `cal_live_` (production) |

## Development

```bash
git clone https://github.com/bcharleson/calcom-cli.git
cd calcom-cli
npm install

# Dev mode (no build needed)
npm run dev -- profile me --pretty
npm run dev -- bookings list --status upcoming --pretty
npm run dev:mcp                     # test MCP server

# Production build
npm run build                       # → dist/index.js + dist/mcp.js
npm run typecheck                   # TypeScript strict mode

# Adding a new command:
# 1. Add CommandDefinition in src/commands/<group>/index.ts
# 2. Export from the group's commands array
# 3. Import in src/commands/index.ts → allCommands
# 4. npm run build && calcom <group> <subcommand> --help
```

## Related Projects

This tool follows the same architecture as other agent-native CLI/MCP tools:

- [calendly-cli](https://github.com/bcharleson/calendly-cli) — Calendly API
- [instantly-cli](https://github.com/bcharleson/instantly-cli) — Instantly.ai API
- [heyreach-cli](https://github.com/bcharleson/heyreach-cli) — HeyReach API

## License

MIT
