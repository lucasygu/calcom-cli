import { AuthError, NotFoundError, RateLimitError, ServerError, ValidationError } from './errors.js';

export const BASE_URL = 'https://api.cal.com/v2';

// Cal.com's API v2 pins a different `cal-api-version` per resource. Sending one
// global version 404s the endpoints that expect an older one (their routing is
// version-scoped). Empirically verified against api.cal.com (2026-07): most
// resources accept 2024-08-13, but event-types and schedules do not.
const DEFAULT_API_VERSION = '2024-08-13';
const API_VERSION_BY_PREFIX: Array<[string, string]> = [
  ['/event-types', '2024-06-14'],
  ['/schedules', '2024-06-11'],
  ['/slots/reservations', '2024-09-04'],
];
// Exact-path pins, checked before the prefixes. The newer `/slots` endpoint
// (params start/end/timeZone) needs 2024-09-04, while the legacy
// `/slots/available` must stay on the default.
// The hosted OpenAPI spec lists newer versions for some resources (bookings
// 2026-02-25, event-types 2026-06-12). These pins are older on purpose: the
// request shapes here are those versions', and Cal.com still serves them.
const API_VERSION_EXACT: Record<string, string> = {
  '/slots': '2024-09-04',
};

function apiVersionForPath(path: string): string {
  const exact = API_VERSION_EXACT[path];
  if (exact) return exact;
  for (const [prefix, version] of API_VERSION_BY_PREFIX) {
    if (path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)) {
      return version;
    }
  }
  return DEFAULT_API_VERSION;
}

const DEFAULT_TIMEOUT = 30_000;
const WRITE_TIMEOUT = 15_000;
const MAX_RETRIES = 3;

export interface CalcomClientOptions {
  /** Omit for an anonymous client that can only reach Cal.com's public endpoints. */
  apiKey?: string;
  baseUrl?: string;
  maxRetries?: number;
  timeout?: number;
}

export class CalcomClient {
  private apiKey?: string;
  private baseUrl: string;
  private maxRetries: number;
  private timeout: number;

  constructor(opts: CalcomClientOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl ?? BASE_URL;
    this.maxRetries = opts.maxRetries ?? MAX_RETRIES;
    this.timeout = opts.timeout ?? DEFAULT_TIMEOUT;
  }

  /** True when the client carries an API key. */
  get authenticated(): boolean {
    return Boolean(this.apiKey);
  }

  /** A client for public endpoints only: the same calls a booking page makes. */
  anonymous(): CalcomClient {
    return new CalcomClient({
      baseUrl: this.baseUrl,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
    });
  }

  private headers(path: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'cal-api-version': apiVersionForPath(path),
      'User-Agent': 'calcom-cli/0.2.1',
    };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
    return headers;
  }

  private async request<T>(
    method: string,
    path: string,
    opts: { query?: Record<string, unknown>; body?: unknown } = {},
    attempt = 0,
  ): Promise<T> {
    const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
    const timeout = isWrite ? WRITE_TIMEOUT : this.timeout;
    // A POST that timed out or hit a 5xx may still have been applied (a booking
    // created, a webhook added). Retrying it can do the thing twice, so only
    // 429s, which Cal.com rejects before processing, are retried for POST.
    const retryable = method.toUpperCase() !== 'POST';

    let url = `${this.baseUrl}${path}`;
    if (opts.query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined && v !== null && v !== '') {
          params.set(k, String(v));
        }
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, {
        method: method.toUpperCase(),
        headers: this.headers(path),
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.status === 204) return {} as T;

      const text = await res.text();
      let data: any;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text };
      }

      if (!res.ok) {
        // Cal.com error shape is { status: 'error', error: { code, message, details } }.
        // Dig into error.message rather than stringifying the object (which printed
        // "[object Object]"). Fall back through the other shapes we've seen.
        const errObj = data?.error;
        const msg =
          data?.message ??
          (typeof errObj === 'string' ? errObj : errObj?.message) ??
          errObj?.details?.message ??
          (data?.errors && Array.isArray(data.errors)
            ? data.errors.map((d: any) => d.message ?? String(d)).join('; ')
            : undefined) ??
          res.statusText;

        if (res.status === 401 || res.status === 403) throw new AuthError(msg);
        if (res.status === 404) throw new NotFoundError(msg);
        if (res.status === 400 || res.status === 422) throw new ValidationError(msg);
        if (res.status === 429) {
          const retryAfter = Number(res.headers.get('retry-after') ?? 60);
          if (attempt < this.maxRetries) {
            await sleep(retryAfter * 1000);
            return this.request<T>(method, path, opts, attempt + 1);
          }
          throw new RateLimitError(msg, retryAfter);
        }
        if (res.status >= 500) {
          if (!retryable) {
            throw new ServerError(`${msg} (not retried: this ${method} may have been applied; check before trying again)`, res.status);
          }
          if (attempt < this.maxRetries) {
            await sleep(Math.pow(2, attempt) * 1000);
            return this.request<T>(method, path, opts, attempt + 1);
          }
          throw new ServerError(msg, res.status);
        }
        throw new Error(msg);
      }

      return data as T;
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        if (!retryable) {
          throw new Error(`Request timed out (not retried: this ${method} may have been applied; check before trying again)`);
        }
        if (attempt < this.maxRetries) {
          await sleep(1000 * (attempt + 1));
          return this.request<T>(method, path, opts, attempt + 1);
        }
        throw new Error('Request timed out');
      }
      throw err;
    }
  }

  get<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    return this.request<T>('GET', path, { query });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, { body });
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, { body });
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, { body });
  }

  delete<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    return this.request<T>('DELETE', path, { query });
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
