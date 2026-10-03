import type { CalcomClient } from './client.js';
import { NotFoundError, ValidationError } from './errors.js';

/**
 * Someone else's Cal.com booking link, parsed. Shapes handled:
 *   cal.com/<user>/<slug>          (scheme optional, query string ignored)
 *   <org>.cal.com/<user>/<slug>    (organization subdomain)
 *   cal.com/team/<team>/<slug>     (team event)
 */
export interface ParsedCalLink {
  input: string;
  pageUrl: string;
  orgSlug?: string;
  username?: string;
  teamSlug?: string;
  slug?: string;
}

export interface ResolvedCalEvent {
  url: string;
  pageUrl: string;
  username?: string;
  teamSlug?: string;
  orgSlug?: string;
  slug: string;
  eventTypeId: number;
  title?: string;
  lengthInMinutes?: number;
  locations?: string[];
  /** The timezone the owner's availability schedule is set in (from their public page). */
  ownerScheduleTimeZone?: string;
  resolvedVia: 'api' | 'page';
}

export function parseCalLink(raw: string): ParsedCalLink {
  const input = raw.trim();
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    throw new ValidationError(`Not a URL: ${raw}`);
  }
  const host = url.hostname.toLowerCase();
  if (host !== 'cal.com' && !host.endsWith('.cal.com')) {
    throw new ValidationError(`Not a Cal.com link: ${raw}`);
  }
  const sub = host === 'cal.com' ? '' : host.slice(0, -'.cal.com'.length);
  const orgSlug = sub && !['app', 'www', 'api'].includes(sub) ? sub : undefined;
  const parts = url.pathname.split('/').filter(Boolean).map((p) => decodeURIComponent(p));

  const parsed: ParsedCalLink = { input, pageUrl: `https://${host}${url.pathname}`, orgSlug };
  if (parts[0] === 'team') {
    parsed.teamSlug = parts[1];
    parsed.slug = parts[2];
  } else {
    parsed.username = parts[0];
    parsed.slug = parts[1];
  }
  if (!parsed.username && !parsed.teamSlug) {
    throw new ValidationError(`The link names no user or team: ${raw}`);
  }
  return parsed;
}

/**
 * Turn a booking link into its event type. Tries the public event-types API
 * first (the link's username, then its `_`/`-` spelling variant: `cal.com/x_y`
 * links resolve to the account `x-y`), then falls back to the public page.
 */
export async function resolveCalLink(link: string, client: CalcomClient): Promise<ResolvedCalEvent> {
  const p = parseCalLink(link);
  if (!p.slug) {
    const who = p.username ?? `team/${p.teamSlug}`;
    throw new ValidationError(
      `That link is a profile, not an event. Use the event link, e.g. cal.com/${who}/30min`,
    );
  }
  const anon = client.anonymous();
  let page: string | undefined;
  const pageText = async () => {
    if (page === undefined) page = await fetchPublicPage(p.pageUrl).catch(() => '');
    return page;
  };

  if (p.username) {
    const candidates = [...new Set([p.username, p.username.replace(/_/g, '-'), p.username.replace(/-/g, '_')])];
    for (const username of candidates) {
      const query: Record<string, unknown> = { username, eventSlug: p.slug };
      if (p.orgSlug) query.orgSlug = p.orgSlug;
      const res: any = await anon.get('/event-types', query).catch(() => null);
      const list: any[] = Array.isArray(res?.data) ? res.data : res?.data ? [res.data] : [];
      const ev = list.find((e) => e?.slug === p.slug) ?? list[0];
      if (ev?.id) {
        return {
          url: p.input,
          pageUrl: p.pageUrl,
          username,
          orgSlug: p.orgSlug,
          slug: p.slug,
          eventTypeId: Number(ev.id),
          title: ev.title,
          lengthInMinutes: ev.lengthInMinutes ?? ev.length,
          // v2 shape: { type: 'integration', integration: 'google-meet' } | { type: 'address', address } ...
          locations: Array.isArray(ev.locations)
            ? ev.locations.map((l: any) => l?.integration ?? l?.type).filter(Boolean)
            : undefined,
          ownerScheduleTimeZone: scrapeScheduleTimeZone(await pageText()),
          resolvedVia: 'api',
        };
      }
    }
  }

  const html = await pageText();
  const ev = scrapeEventData(html);
  if (!ev) throw new NotFoundError(`No bookable event found at ${p.pageUrl}`);
  return {
    url: p.input,
    pageUrl: p.pageUrl,
    username: ev.username ?? p.username,
    teamSlug: p.teamSlug,
    orgSlug: p.orgSlug,
    slug: p.slug,
    eventTypeId: ev.id,
    title: ev.title,
    lengthInMinutes: ev.length,
    ownerScheduleTimeZone: scrapeScheduleTimeZone(html),
    resolvedVia: 'page',
  };
}

async function fetchPublicPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (calcom-cli)' },
      signal: controller.signal,
    });
    // The booking page streams its data as escaped JSON inside the HTML.
    return (await res.text()).replace(/\\"/g, '"');
  } finally {
    clearTimeout(timer);
  }
}

function scrapeEventData(html: string): { id: number; title?: string; length?: number; username?: string } | undefined {
  const at = html.indexOf('"eventData":{"id":');
  if (at < 0) return undefined;
  const tail = html.slice(at, at + 20_000);
  const id = Number(tail.match(/"eventData":\{"id":(\d+)/)?.[1]);
  if (!id) return undefined;
  const title = tail.match(/"title":"([^"]*)"/)?.[1];
  const length = Number(tail.match(/"length":(\d+)/)?.[1]) || undefined;
  const username = [...html.matchAll(/"username":"([^"]+)"/g)].map((m) => m[1]).find((u) => u !== 'Username');
  return { id, title, length, username };
}

function scrapeScheduleTimeZone(html: string): string | undefined {
  return html.match(/"schedule":\{"id":\d+,"timeZone":"([^"]+)"/)?.[1];
}
