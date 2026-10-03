import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCalLink } from './calLink.js';
import { ValidationError } from './errors.js';

test('parses a personal event link, with or without scheme and query', () => {
  for (const raw of ['https://cal.com/jane-doe/30min', 'cal.com/jane-doe/30min?month=2026-10', ' cal.com/jane-doe/30min ']) {
    const p = parseCalLink(raw);
    assert.equal(p.username, 'jane-doe');
    assert.equal(p.slug, '30min');
    assert.equal(p.orgSlug, undefined);
    assert.equal(p.pageUrl, 'https://cal.com/jane-doe/30min');
  }
});

test('keeps underscores as given (resolution tries the variants)', () => {
  assert.equal(parseCalLink('cal.com/jane_doe/intro').username, 'jane_doe');
});

test('parses a team event link', () => {
  const p = parseCalLink('https://cal.com/team/acme/demo');
  assert.equal(p.teamSlug, 'acme');
  assert.equal(p.slug, 'demo');
  assert.equal(p.username, undefined);
});

test('parses an organization subdomain, but not app/www', () => {
  assert.equal(parseCalLink('https://acme.cal.com/jane/15min').orgSlug, 'acme');
  assert.equal(parseCalLink('https://app.cal.com/jane/15min').orgSlug, undefined);
  assert.equal(parseCalLink('https://www.cal.com/jane/15min').orgSlug, undefined);
});

test('a profile link parses with no slug', () => {
  const p = parseCalLink('cal.com/jane-doe');
  assert.equal(p.username, 'jane-doe');
  assert.equal(p.slug, undefined);
});

test('rejects links that are not Cal.com booking links', () => {
  assert.throws(() => parseCalLink('https://calendly.com/jane/30min'), ValidationError);
  assert.throws(() => parseCalLink('https://notcal.com/jane/30min'), ValidationError);
  assert.throws(() => parseCalLink('https://cal.com/'), ValidationError);
});
