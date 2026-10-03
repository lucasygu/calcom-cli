// Check every command against Cal.com's published OpenAPI spec, offline from the API itself.
// Each handler runs with sample input against a mocked fetch; the request it would send is
// compared with the spec (path, method, query and body fields, cal-api-version).
//
//   npm run audit:spec                 # fetches the hosted spec
//   npm run audit:spec -- ./spec.json  # or a local copy
//
// Exit 1 when a command sends something the spec doesn't allow and it isn't a known,
// live-verified exception below. A mismatch is a lead, not a verdict: older API versions
// (which this CLI pins) can still accept what the latest spec dropped, so confirm a new
// finding against the live API (bogus IDs, invalid bodies) before changing a command.
// Blind spots: a field the server silently strips (disableGuests was one) and a path
// segment filled with the wrong kind of value (calendars check once sent a credential ID
// where a calendar type goes) both pass. Only a live probe shows those.
import { readFileSync } from 'node:fs';
import { allCommands } from '../src/commands/index.js';
import { CalcomClient } from '../src/core/client.js';

const SPEC_URL = 'https://cal.com/docs/api-reference/v2/openapi.json';

// Deviations checked against api.cal.com and found fine (2026-10-03).
const KNOWN: Record<string, string> = {
  'bookings list|unknown query param: take': 'take/skip page at cal-api-version 2024-08-13; the spec shows 2026-05-01 (cursor/limit)',
  'bookings list|unknown query param: skip': 'as above',
  'slots available|path not in spec: GET /v2/slots/available': 'legacy route, still served',
};
// Inputs the sampler must not set: they make the handler throw before any request.
const SKIP_INPUTS = new Set(['disableGuests']);

const specArg = process.argv[2];
const spec = specArg
  ? JSON.parse(readFileSync(specArg, 'utf8'))
  : await (await fetch(SPEC_URL)).json();

function deref(s: any): any {
  if (!s?.$ref) return s;
  return deref(s.$ref.split('/').slice(1).reduce((o: any, k: string) => o[k], spec));
}
function bodyShape(schema: any): { props: Set<string>; required: Set<string>; variants: number } {
  const s = deref(schema);
  const out = { props: new Set<string>(), required: new Set<string>(), variants: 1 };
  const parts = s?.oneOf ?? s?.anyOf ?? s?.allOf;
  if (parts) {
    out.variants = parts.length;
    for (const p of parts) bodyShape(p).props.forEach((x) => out.props.add(x));
    return out;
  }
  Object.keys(s?.properties ?? {}).forEach((k) => out.props.add(k));
  (s?.required ?? []).forEach((k: string) => out.required.add(k));
  return out;
}

function sample(def: any): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const [k, v] of Object.entries<any>(def.inputSchema?.shape ?? {})) {
    if (SKIP_INPUTS.has(k)) continue;
    let t = v;
    while (t?._def?.innerType) t = t._def.innerType;
    const tn = t?._def?.typeName;
    if (tn === 'ZodNumber') input[k] = 123;
    else if (tn === 'ZodBoolean') input[k] = true;
    else if (tn === 'ZodEnum') input[k] = t._def.values[0];
    else if (tn === 'ZodArray') input[k] = [];
    else if (/email/i.test(k)) input[k] = 'a@example.com';
    else if (/zone/i.test(k)) input[k] = 'America/Toronto';
    else if (/^(start|end)$|Start$|End$|date|Time$|Utc$|after|before/.test(k)) input[k] = '2026-10-08T16:00:00Z';
    else if (/json|availability|metadata|overrides|locations/i.test(k)) input[k] = '[]';
    else if (/Id$|uid$|Uid$/.test(k)) input[k] = '123';
    else input[k] = 'x';
  }
  return input;
}

type Req = { method: string; url: URL; headers: Record<string, string>; body?: any };
let captured: Req[] = [];
globalThis.fetch = (async (url: string, init: any) => {
  captured.push({ method: init.method, url: new URL(url), headers: init.headers, body: init.body ? JSON.parse(init.body) : undefined });
  return new Response(JSON.stringify({ status: 'success', data: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
}) as typeof fetch;

const templates = Object.keys(spec.paths).map((tpl) => ({ tpl, re: new RegExp('^' + tpl.replace(/\{[^}]+\}/g, '[^/]+') + '$') }));
const client = new CalcomClient({ apiKey: 'cal_test_audit' });
let failures = 0;

for (const def of allCommands as any[]) {
  if (def.group === 'link') continue; // composite commands, covered by their own live tests
  const cmd = `${def.group} ${def.subcommand}`;
  captured = [];
  let error: string | undefined;
  try {
    await def.handler(sample(def), client);
  } catch (e: any) {
    error = e?.message ?? String(e);
  }
  const issues: string[] = [];
  const notes: string[] = [];
  if (!captured.length) issues.push(`sends no request${error ? `: ${error}` : ''}`);
  for (const r of captured) {
    const path = r.url.pathname;
    const tpl = templates.find((t) => t.re.test(path))?.tpl;
    const op = tpl ? spec.paths[tpl][r.method.toLowerCase()] : undefined;
    if (!tpl) issues.push(`path not in spec: ${r.method} ${path}`);
    else if (!op) issues.push(`method ${r.method} not allowed on ${tpl} (spec: ${Object.keys(spec.paths[tpl]).join(', ')})`);
    if (!op) continue;
    const params = op.parameters ?? [];
    const version = params.find((p: any) => p.name === 'cal-api-version')?.schema?.default;
    if (version && version !== r.headers['cal-api-version']) notes.push(`cal-api-version ${r.headers['cal-api-version']} (spec latest ${version})`);
    const query = new Set(params.filter((p: any) => p.in === 'query').map((p: any) => p.name));
    for (const k of r.url.searchParams.keys()) if (!query.has(k)) issues.push(`unknown query param: ${k}`);
    for (const p of params) if (p.in === 'query' && p.required && !r.url.searchParams.has(p.name)) issues.push(`missing required query param: ${p.name}`);
    const schema = op.requestBody?.content?.['application/json']?.schema;
    if (r.body && typeof r.body === 'object' && !Array.isArray(r.body)) {
      if (!schema) issues.push(`sends a body the spec doesn't take: ${Object.keys(r.body).join(', ')}`);
      else {
        const { props, required, variants } = bodyShape(schema);
        for (const k of Object.keys(r.body)) if (props.size && !props.has(k)) issues.push(`unknown body field: ${k}`);
        if (variants === 1) for (const k of required) if (!(k in r.body)) issues.push(`missing required body field: ${k}`);
      }
    }
  }
  const open = issues.filter((i) => !KNOWN[`${cmd}|${i}`]);
  failures += open.length;
  console.log(`${open.length ? '✗' : '✓'} ${cmd}`);
  for (const i of issues) console.log(`    ${KNOWN[`${cmd}|${i}`] ? `- known: ${i} (${KNOWN[`${cmd}|${i}`]})` : `- ${i}`}`);
  for (const n of notes) console.log(`    · ${n}`);
}

console.log(failures ? `\n${failures} open finding(s)` : '\nNo open findings');
process.exit(failures ? 1 : 0);
