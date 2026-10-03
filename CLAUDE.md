# calcom-cli

CLI and MCP server for the Cal.com API v2.

## Quick Reference

- **Build:** `npm run build`
- **Dev CLI:** `npm run dev -- <command>`
- **Dev MCP:** `npm run dev:mcp`
- **Type check:** `npm run typecheck`
- **Tests:** `npm test` (node:test via tsx; pure helpers in `src/core/*.test.ts`)
- **Spec audit:** `npm run audit:spec` runs every command against a mocked fetch and checks
  the request against Cal.com's hosted OpenAPI spec. Run it after touching any command. A new
  finding is a lead: confirm it live with bogus IDs or invalid bodies (no side effects) first,
  because the older `cal-api-version` pins can still accept what the latest spec dropped.

## Architecture

Single `CommandDefinition` as source of truth — shared by CLI (Commander.js) and MCP server.

- `src/core/` — types, client, auth, config, handler, output, errors
- `src/commands/<group>/index.ts` — command definitions per API resource
- `src/commands/index.ts` — registry + CLI registration
- `src/mcp/server.ts` — MCP tool registration from allCommands
- `src/commands/link/` — attendee side: book on someone else's public link. Composite handlers
  built on `src/core/calLink.ts` (link → event type) and `src/core/busy.ts` (your busy times)
- A command with `auth: 'optional'` runs with an anonymous client when no key is set;
  `client.anonymous()` gives a key-less client for public endpoints (booking pages use these)

## Adding a Command

1. Add `CommandDefinition` in `src/commands/<group>/index.ts`
2. Export from the group's `*Commands` array
3. Import in `src/commands/index.ts` → `allCommands`
4. Build and test: `npm run dev -- <group> <subcommand>`

## API

- Base URL: `https://api.cal.com/v2`
- Auth: `Authorization: Bearer cal_live_xxxx` (omitted for public calls)
- Version header: per resource, see `client.ts`. Default `2024-08-13`; `/event-types` →
  `2024-06-14`; `/schedules` → `2024-06-11`; exact `/slots` → `2024-09-04` (the legacy
  `/slots/available` stays on the default). A wrong version 404s.
- Busy times live at `/calendars/busy-times` and need `calendarsToLoad[i][credentialId|externalId]`
  for each calendar. `/calendars/busy` does not exist.
- Booking notes go in `bookingFieldsResponses.notes`, not a top-level `notes`.
- Reschedule returns a new booking UID; the old one is dead.
- `/slots` reads bare `start`/`end` dates as UTC days, whatever `timeZone` says. `link slots`
  sends the UTC instants of local midnight (`zonedDayStart` in `time.ts`) so days are local.
- Rate limit: 120 req/min
- POSTs are never retried after a timeout or 5xx (only 429s): a booking may already exist.
- Routes that moved (verified live 2026-10-03): out-of-office is `/me/ooo`; slot holds are
  `/slots/reservations` (body `slotStart`, version 2024-09-04); absence is `/mark-absent`;
  booking location is `PATCH /bookings/{uid}/location`; `{calendar}` and `{app}` path segments
  take a type or slug (google, google-meet), never a credential ID; destination calendar is PUT.
