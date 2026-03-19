import { AuthError, NotFoundError, RateLimitError, ServerError, ValidationError } from './errors.js';

export const BASE_URL = 'https://api.cal.com/v2';
const API_VERSION = '2024-08-13';
const DEFAULT_TIMEOUT = 30_000;
const WRITE_TIMEOUT = 15_000;
const MAX_RETRIES = 3;

export interface CalcomClientOptions {
  apiKey: string;
  baseUrl?: string;
  maxRetries?: number;
  timeout?: number;
}

export class CalcomClient {
  private apiKey: string;
  private baseUrl: string;
  private maxRetries: number;
  private timeout: number;

  constructor(opts: CalcomClientOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl ?? BASE_URL;
    this.maxRetries = opts.maxRetries ?? MAX_RETRIES;
    this.timeout = opts.timeout ?? DEFAULT_TIMEOUT;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'cal-api-version': API_VERSION,
      'User-Agent': 'calcom-cli/0.1.0',
    };
  }

  private async request<T>(
    method: string,
    path: string,
    opts: { query?: Record<string, unknown>; body?: unknown } = {},
    attempt = 0,
  ): Promise<T> {
    const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
    const timeout = isWrite ? WRITE_TIMEOUT : this.timeout;

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
        headers: this.headers(),
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
        const msg =
          data?.message ??
          data?.error ??
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

  delete<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    return this.request<T>('DELETE', path, { query });
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
