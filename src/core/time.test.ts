import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plusMinutes, startsByDay, todayIn, zonedDayStart, type DaySlot } from './time.js';
import { overlapsBusy } from './busy.js';

test('plusMinutes keeps the start offset', () => {
  assert.equal(plusMinutes('2026-10-06T14:00:00.000-04:00', 30), '2026-10-06T14:30:00.000-04:00');
  assert.equal(plusMinutes('2026-10-06T23:45:00.000+08:00', 30), '2026-10-07T00:15:00.000+08:00');
});

test('plusMinutes without an offset falls back to UTC', () => {
  assert.equal(plusMinutes('2026-10-06T18:00:00Z', 60), '2026-10-06T19:00:00.000Z');
});

test('zonedDayStart gives the UTC instant a local day begins', () => {
  const iso = (d: string, tz: string) => zonedDayStart(d, tz).toISOString();
  assert.equal(iso('2026-10-08', 'America/Toronto'), '2026-10-08T04:00:00.000Z');
  assert.equal(iso('2026-10-08', 'UTC'), '2026-10-08T00:00:00.000Z');
  assert.equal(iso('2026-10-08', 'Asia/Shanghai'), '2026-10-07T16:00:00.000Z');
  assert.equal(iso('2026-10-08', 'Asia/Kolkata'), '2026-10-07T18:30:00.000Z');
  assert.equal(iso('2026-10-08', 'America/Los_Angeles'), '2026-10-08T07:00:00.000Z');
});

test('zonedDayStart across DST changes', () => {
  // 2026: US DST starts Mar 8, ends Nov 1 (at 2am, so midnight keeps the old offset)
  assert.equal(zonedDayStart('2026-03-08', 'America/Toronto').toISOString(), '2026-03-08T05:00:00.000Z');
  assert.equal(zonedDayStart('2026-03-09', 'America/Toronto').toISOString(), '2026-03-09T04:00:00.000Z');
  assert.equal(zonedDayStart('2026-11-01', 'America/Toronto').toISOString(), '2026-11-01T04:00:00.000Z');
  assert.equal(zonedDayStart('2026-11-02', 'America/Toronto').toISOString(), '2026-11-02T05:00:00.000Z');
});

test('todayIn uses the local date, not the UTC one', () => {
  const lateEvening = new Date('2026-10-04T02:00:00Z'); // 22:00 Oct 3 in Toronto
  assert.equal(todayIn('America/Toronto', lateEvening), '2026-10-03');
  assert.equal(todayIn('UTC', lateEvening), '2026-10-04');
  assert.equal(todayIn('Asia/Shanghai', lateEvening), '2026-10-04');
});

const slot = (start: string, date: string, time: string): DaySlot => ({ start, date, time });

test('startsByDay joins consecutive slots and splits on gaps', () => {
  const slots = [
    slot('2026-10-03T12:00:00-04:00', '2026-10-03 Sat', '12:00'),
    slot('2026-10-03T12:30:00-04:00', '2026-10-03 Sat', '12:30'),
    slot('2026-10-03T13:00:00-04:00', '2026-10-03 Sat', '13:00'),
    // 13:30 taken
    slot('2026-10-03T14:00:00-04:00', '2026-10-03 Sat', '14:00'),
    slot('2026-10-03T14:30:00-04:00', '2026-10-03 Sat', '14:30'),
    slot('2026-10-04T09:00:00-04:00', '2026-10-04 Sun', '09:00'),
  ];
  assert.deepEqual(startsByDay(slots, 30), {
    '2026-10-03 Sat': ['12:00–13:00', '14:00–14:30'],
    '2026-10-04 Sun': ['09:00'],
  });
});

test('startsByDay infers the step from the data, not the meeting length', () => {
  // 30-minute meetings offered every 15 minutes
  const slots = [
    slot('2026-10-06T14:00:00-04:00', '2026-10-06 Tue', '14:00'),
    slot('2026-10-06T14:15:00-04:00', '2026-10-06 Tue', '14:15'),
    slot('2026-10-06T14:30:00-04:00', '2026-10-06 Tue', '14:30'),
  ];
  assert.deepEqual(startsByDay(slots, 30), { '2026-10-06 Tue': ['14:00–14:30'] });
});

test('startsByDay handles unsorted input and empty input', () => {
  const slots = [
    slot('2026-10-06T15:00:00-04:00', '2026-10-06 Tue', '15:00'),
    slot('2026-10-06T14:00:00-04:00', '2026-10-06 Tue', '14:00'),
    slot('2026-10-06T14:30:00-04:00', '2026-10-06 Tue', '14:30'),
  ];
  assert.deepEqual(startsByDay(slots, 30), { '2026-10-06 Tue': ['14:00–15:00'] });
  assert.deepEqual(startsByDay([], 30), {});
});

test('overlapsBusy treats touching edges as free', () => {
  const busy = [{ start: '2026-10-06T18:00:00Z', end: '2026-10-06T19:00:00Z' }];
  assert.equal(overlapsBusy('2026-10-06T17:30:00Z', 30, busy), false); // ends as busy starts
  assert.equal(overlapsBusy('2026-10-06T19:00:00Z', 30, busy), false); // starts as busy ends
  assert.equal(overlapsBusy('2026-10-06T18:30:00Z', 30, busy), true);
  assert.equal(overlapsBusy('2026-10-06T14:45:00-04:00', 30, busy), true); // 18:45Z, offset-aware
});
