# calcom-cli — Agent Implementation Guide

MCP server name: `calcom`
Total tools: 61

Use this guide to understand every available Cal.com MCP tool, its input schema, and common workflow patterns. Each tool maps 1:1 to a Cal.com API v2 endpoint.

---

## Setup

```bash
# Claude Code
claude mcp add calcom -- npx calcom-cli mcp

# Or with env var
CAL_API_KEY=cal_live_xxxx claude mcp add calcom -- npx calcom-cli mcp
```

```json
// Claude Desktop / Cursor / Windsurf
{
  "mcpServers": {
    "calcom": {
      "command": "npx",
      "args": ["-y", "calcom-cli", "mcp"],
      "env": { "CAL_API_KEY": "cal_live_xxxx" }
    }
  }
}
```

---

## Tool Reference

### Profile (2 tools)

#### `profile_me`
Get the authenticated user's profile. Returns name, email, username, timezone, default schedule, and more.
```json
// Input
{}
// Returns: { status, data: { id, username, name, email, timeZone, defaultScheduleId, ... } }
```

#### `profile_update`
Update the authenticated user's profile.
```json
// Input (all fields optional)
{
  "name": "string",
  "bio": "string",
  "timeZone": "string — e.g. America/New_York",
  "weekStart": "string — Sunday, Monday, etc.",
  "timeFormat": "number — 12 or 24",
  "defaultScheduleId": "number"
}
```

---

### Bookings (13 tools)

#### `bookings_list`
List bookings for the authenticated user. Supports filtering and pagination.
```json
// Input (all fields optional)
{
  "status": "string — upcoming | recurring | past | cancelled | unconfirmed",
  "attendeeEmail": "string — filter by attendee email",
  "eventTypeId": "number — filter by event type",
  "eventTypeIds": "string — comma-separated IDs",
  "afterStart": "string — ISO 8601 datetime",
  "beforeEnd": "string — ISO 8601 datetime",
  "sortStart": "string — asc | desc",
  "sortEnd": "string — asc | desc",
  "sortCreated": "string — asc | desc",
  "take": "number — results per page",
  "skip": "number — offset",
  "teamsIds": "string — comma-separated team IDs"
}
```

#### `bookings_get`
Get a specific booking by UID. Returns full booking details including attendees, location, and metadata.
```json
{ "bookingUid": "string — required" }
```

#### `bookings_create`
Create a new booking. The attendee receives a confirmation email.
```json
{
  "eventTypeId": "number — required",
  "start": "string — required, ISO 8601",
  "attendeeName": "string — required",
  "attendeeEmail": "string — required",
  "attendeeTimezone": "string — required, e.g. America/New_York",
  "attendeeLanguage": "string — optional, e.g. en",
  "guests": "string — optional, comma-separated emails",
  "meetingUrl": "string — optional, custom meeting URL",
  "notes": "string — optional",
  "metadata": "string — optional, JSON string"
}
```

#### `bookings_cancel`
Cancel a booking. Sends cancellation notification to attendees.
```json
{
  "bookingUid": "string — required",
  "cancellationReason": "string — optional"
}
```

#### `bookings_confirm`
Confirm a booking that requires manual confirmation.
```json
{ "bookingUid": "string — required" }
```

#### `bookings_decline`
Decline a pending booking.
```json
{
  "bookingUid": "string — required",
  "reason": "string — optional"
}
```

#### `bookings_reschedule`
Reschedule a booking to a new time. Notifies all participants.
```json
{
  "bookingUid": "string — required",
  "start": "string — required, new ISO 8601 start time",
  "rescheduleReason": "string — optional"
}
```

#### `bookings_mark_absence`
Mark a no-show for a booking (host or specific attendees).
```json
{
  "bookingUid": "string — required",
  "host": "boolean — optional, mark host as absent",
  "attendees": "string — optional, comma-separated emails of absent attendees"
}
```

#### `bookings_reassign`
Reassign a booking to a different host (round-robin team events).
```json
{ "bookingUid": "string — required" }
```

#### `bookings_update_location`
Update the meeting location or link for a booking.
```json
{
  "bookingUid": "string — required",
  "type": "string — required: link | integration | address | phone",
  "link": "string — optional, meeting URL",
  "integration": "string — optional, e.g. google_meet, zoom",
  "address": "string — optional, physical address",
  "phone": "string — optional, phone number"
}
```

#### `bookings_attendees`
List all attendees for a booking.
```json
{ "bookingUid": "string — required" }
```

#### `bookings_add_attendee`
Add a new attendee to an existing booking.
```json
{
  "bookingUid": "string — required",
  "name": "string — required",
  "email": "string — required",
  "timeZone": "string — required",
  "language": "string — optional"
}
```

#### `bookings_add_guests`
Add guest email addresses to a booking (guests receive the calendar invite but aren't tracked as full attendees).
```json
{
  "bookingUid": "string — required",
  "guests": "string — required, comma-separated emails"
}
```

---

### Event Types (5 tools)

#### `event_types_list`
List all event types for the authenticated user.
```json
// Input (all optional)
{
  "eventSlug": "string",
  "username": "string",
  "usernames": "string — comma-separated",
  "orgSlug": "string"
}
```

#### `event_types_get`
Get a specific event type by ID.
```json
{ "eventTypeId": "number — required" }
```

#### `event_types_create`
Create a new event type (booking page).
```json
{
  "title": "string — required",
  "slug": "string — required, URL path",
  "lengthInMinutes": "number — required",
  "description": "string — optional",
  "locations": "string — optional, JSON array of location objects",
  "disableGuests": "boolean — optional",
  "slotInterval": "number — optional, minutes",
  "minimumBookingNotice": "number — optional, minutes",
  "beforeEventBuffer": "number — optional, minutes",
  "afterEventBuffer": "number — optional, minutes",
  "scheduleId": "number — optional"
}
```

#### `event_types_update`
Update an existing event type.
```json
{
  "eventTypeId": "number — required",
  "title": "string — optional",
  "slug": "string — optional",
  "lengthInMinutes": "number — optional",
  "description": "string — optional",
  "disableGuests": "boolean — optional",
  "slotInterval": "number — optional",
  "minimumBookingNotice": "number — optional",
  "beforeEventBuffer": "number — optional",
  "afterEventBuffer": "number — optional",
  "scheduleId": "number — optional"
}
```

#### `event_types_delete`
Delete an event type. This is irreversible.
```json
{ "eventTypeId": "number — required" }
```

---

### Schedules (6 tools)

#### `schedules_list`
List all availability schedules.
```json
{}
```

#### `schedules_get`
Get a specific schedule with its availability rules.
```json
{ "scheduleId": "number — required" }
```

#### `schedules_default`
Get the user's default schedule.
```json
{}
```

#### `schedules_create`
Create a new availability schedule.
```json
{
  "name": "string — required",
  "timeZone": "string — required, e.g. America/New_York",
  "isDefault": "boolean — optional",
  "availability": "string — optional, JSON array of availability rules"
}
```

#### `schedules_update`
Update an existing schedule.
```json
{
  "scheduleId": "number — required",
  "name": "string — optional",
  "timeZone": "string — optional",
  "isDefault": "boolean — optional",
  "availability": "string — optional, JSON array"
}
```

#### `schedules_delete`
Delete a schedule.
```json
{ "scheduleId": "number — required" }
```

---

### Slots (5 tools)

#### `slots_available`
Get available booking slots for an event type within a date range. This is the primary tool for finding when someone is free.
```json
{
  "eventTypeId": "number — required",
  "startTime": "string — required, ISO 8601",
  "endTime": "string — required, ISO 8601",
  "eventTypeSlug": "string — optional, alternative to ID",
  "username": "string — optional",
  "timeZone": "string — optional, for returned slot times",
  "duration": "number — optional, override minutes",
  "orgSlug": "string — optional"
}
// Returns: { status, data: { slots: { "2025-03-20": ["2025-03-20T09:00:00Z", ...] } } }
```

#### `slots_reserve`
Temporarily hold a slot before creating a booking (prevents double-booking during multi-step flows).
```json
{
  "eventTypeId": "number — required",
  "slotUtc": "string — required, ISO 8601 UTC"
}
```

#### `slots_get_reserved`
Get details of a reserved slot.
```json
{ "uid": "string — required" }
```

#### `slots_update_reserved`
Move a reservation to a different time.
```json
{
  "uid": "string — required",
  "slotUtc": "string — required, new UTC time",
  "eventTypeId": "number — optional"
}
```

#### `slots_delete_reserved`
Release a reserved slot.
```json
{ "uid": "string — required" }
```

---

### Calendars (5 tools)

#### `calendars_list`
List all connected calendar accounts (Google, Outlook, Apple, etc.).
```json
{}
```

#### `calendars_busy`
Get busy/free times from connected calendars. Useful for understanding real availability beyond Cal.com schedules.
```json
{
  "dateFrom": "string — required, YYYY-MM-DD or ISO",
  "dateTo": "string — required, YYYY-MM-DD or ISO",
  "loggedInUsersTz": "string — optional, timezone",
  "credentialId": "number — optional, filter by calendar"
}
```

#### `calendars_check`
Check the connection health of a calendar credential.
```json
{ "credentialId": "number — required" }
```

#### `calendars_save_credentials`
Save calendar credentials (e.g. Apple Calendar app-specific password).
```json
{
  "type": "string — required, e.g. apple",
  "username": "string — required",
  "password": "string — required"
}
```

#### `calendars_disconnect`
Disconnect a calendar integration.
```json
{ "credentialId": "number — required" }
```

---

### Webhooks (5 tools)

#### `webhooks_list`
List all webhook subscriptions.
```json
{}
```

#### `webhooks_get`
Get webhook details.
```json
{ "webhookId": "string — required" }
```

#### `webhooks_create`
Create a webhook subscription. Triggers include: `BOOKING_CREATED`, `BOOKING_CANCELLED`, `BOOKING_RESCHEDULED`, `BOOKING_CONFIRMED`, `BOOKING_REJECTED`, `BOOKING_COMPLETED`, `BOOKING_NO_SHOW`, `MEETING_ENDED`, `MEETING_STARTED`, `RECORDING_READY`.
```json
{
  "subscriberUrl": "string — required, HTTPS endpoint",
  "triggers": "string — required, comma-separated trigger names",
  "active": "boolean — optional, default true",
  "payloadTemplate": "string — optional",
  "secret": "string — optional, signing secret for verification"
}
```

#### `webhooks_update`
Update an existing webhook.
```json
{
  "webhookId": "string — required",
  "subscriberUrl": "string — optional",
  "triggers": "string — optional, comma-separated",
  "active": "boolean — optional",
  "payloadTemplate": "string — optional",
  "secret": "string — optional"
}
```

#### `webhooks_delete`
Delete a webhook.
```json
{ "webhookId": "string — required" }
```

---

### Out of Office (4 tools)

#### `ooo_list`
List all out-of-office entries.
```json
{}
```

#### `ooo_create`
Create an out-of-office entry. Optionally redirect bookings to another user.
```json
{
  "start": "string — required, YYYY-MM-DD or ISO",
  "end": "string — required, YYYY-MM-DD or ISO",
  "notes": "string — optional, reason",
  "toUserId": "number — optional, redirect bookings to this user"
}
```

#### `ooo_update`
Update an out-of-office entry.
```json
{
  "entryId": "number — required",
  "start": "string — optional",
  "end": "string — optional",
  "notes": "string — optional",
  "toUserId": "number — optional"
}
```

#### `ooo_delete`
Delete an out-of-office entry.
```json
{ "entryId": "number — required" }
```

---

### Teams (5 tools)

#### `teams_list`
List all teams the user belongs to.
```json
{}
```

#### `teams_get`
Get team details.
```json
{ "teamId": "number — required" }
```

#### `teams_create`
Create a new team.
```json
{
  "name": "string — required",
  "slug": "string — optional",
  "bio": "string — optional",
  "hideBranding": "boolean — optional",
  "isPrivate": "boolean — optional",
  "timeZone": "string — optional",
  "timeFormat": "number — optional, 12 or 24",
  "weekStart": "string — optional"
}
```

#### `teams_update`
Update a team.
```json
{
  "teamId": "number — required",
  "name": "string — optional",
  "slug": "string — optional",
  "bio": "string — optional",
  "hideBranding": "boolean — optional",
  "isPrivate": "boolean — optional",
  "timeZone": "string — optional",
  "timeFormat": "number — optional",
  "weekStart": "string — optional"
}
```

#### `teams_delete`
Delete a team.
```json
{ "teamId": "number — required" }
```

---

### Conferencing (5 tools)

#### `conferencing_list`
List connected conferencing apps (Zoom, Google Meet, Daily.co, etc.).
```json
{}
```

#### `conferencing_default`
Get the default conferencing app.
```json
{}
```

#### `conferencing_set_default`
Set the default conferencing app for new event types.
```json
{ "appSlug": "string — required, e.g. google-meet, zoom, daily-video" }
```

#### `conferencing_connect`
Connect a conferencing app.
```json
{ "appSlug": "string — required" }
```

#### `conferencing_disconnect`
Disconnect a conferencing app.
```json
{ "appSlug": "string — required" }
```

---

### Destination Calendars (1 tool)

#### `destination_calendars_update`
Set which calendar new bookings are written to (destination calendar).
```json
{
  "integration": "string — required, e.g. google_calendar, office365_calendar",
  "externalId": "string — required, e.g. primary or calendar email",
  "eventTypeId": "number — optional, scope to specific event type"
}
```

---

### Selected Calendars (2 tools)

#### `selected_calendars_add`
Add a calendar to conflict checking. Cal.com checks selected calendars for busy times when showing available slots.
```json
{
  "integration": "string — required, e.g. google_calendar",
  "externalId": "string — required, calendar ID",
  "credentialId": "number — required"
}
```

#### `selected_calendars_delete`
Remove a calendar from conflict checking.
```json
{
  "integration": "string — required",
  "externalId": "string — required",
  "credentialId": "number — required"
}
```

---

### Stripe (3 tools)

#### `stripe_check`
Check if Stripe is connected for paid event types.
```json
{}
```

#### `stripe_connect`
Get the Stripe Connect authorization URL to start the OAuth flow.
```json
{}
```

#### `stripe_save_credentials`
Save Stripe credentials after completing OAuth.
```json
{
  "code": "string — required, authorization code",
  "state": "string — optional, OAuth state"
}
```

---

## Agent Workflow Patterns

### 1. Book a Meeting (Full Flow)
```
1. event_types_list                              → find the right event type ID
2. slots_available (eventTypeId, date range)     → get available times
3. [Optional] slots_reserve (eventTypeId, slot)  → hold the slot
4. bookings_create (eventTypeId, start, attendee) → create the booking
```

### 2. Check Today's Schedule
```
1. bookings_list (status=upcoming, afterStart=today 00:00, beforeEnd=today 23:59)
   → returns all today's bookings with times, attendees, and meeting links
```

### 3. Find Next Available Time
```
1. event_types_list → get event types with their durations
2. slots_available (next 7 days) → returns all open slots grouped by day
3. Pick the earliest slot and present to user
```

### 4. Reschedule a Meeting
```
1. bookings_get (bookingUid) → confirm the booking details
2. slots_available (same event type, new date range) → find alternatives
3. bookings_reschedule (bookingUid, new start, reason)
```

### 5. Cancel with Reason
```
1. bookings_get (bookingUid) → get details for confirmation
2. bookings_cancel (bookingUid, cancellationReason)
   → attendees are notified automatically
```

### 6. Set Up Out of Office
```
1. ooo_create (start, end, notes)
2. bookings_list (afterStart=ooo_start, beforeEnd=ooo_end) → find conflicts
3. For each conflict: bookings_reschedule or bookings_cancel
```

### 7. Monitor Bookings with Webhooks
```
1. webhooks_create (subscriberUrl, triggers=BOOKING_CREATED,BOOKING_CANCELLED)
2. webhooks_list → verify it's active
3. webhooks_update (webhookId, active=false) → pause notifications
```

### 8. Multi-step Booking with Slot Reservation
```
1. slots_available → show options to user
2. slots_reserve (selected slot) → hold it (prevents race conditions)
3. [Collect attendee info from user]
4. bookings_create → finalize booking
5. slots_delete_reserved → cleanup if booking fails
```

---

## Error Handling

All tools return structured errors:
```json
{
  "error": "Human-readable message",
  "code": "AUTH_ERROR | NOT_FOUND | VALIDATION_ERROR | RATE_LIMIT | SERVER_ERROR | UNKNOWN_ERROR"
}
```

- **AUTH_ERROR (401/403)**: Invalid or expired API key. Re-authenticate.
- **NOT_FOUND (404)**: Resource doesn't exist. Check the ID/UID.
- **VALIDATION_ERROR (400/422)**: Invalid input. Check required fields.
- **RATE_LIMIT (429)**: Exceeded 120 req/min. Auto-retried 3 times before failing.
- **SERVER_ERROR (5xx)**: Cal.com API issue. Auto-retried 3 times with exponential backoff.

---

## Tips for Agents

1. **Always check event types first** — you need an `eventTypeId` for slots and bookings
2. **Use `slots_available` before booking** — confirms the time is actually open
3. **Date format is ISO 8601** — e.g. `2025-03-20T10:00:00Z` (always include timezone or use UTC)
4. **Booking UIDs are strings**, event type IDs and schedule IDs are numbers
5. **Pagination**: use `take` (page size) and `skip` (offset) for large result sets
6. **The `--pretty` flag is CLI-only** — MCP tools always return structured JSON
