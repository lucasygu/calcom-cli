export class CalcomError extends Error {
  code: string;
  statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'CalcomError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class AuthError extends CalcomError {
  constructor(message = 'Authentication failed. Run: calcom login') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends CalcomError {
  constructor(message = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends CalcomError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 422);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends CalcomError {
  retryAfter?: number;

  constructor(message = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class ServerError extends CalcomError {
  constructor(message = 'Cal.com API server error', statusCode = 500) {
    super(message, 'SERVER_ERROR', statusCode);
    this.name = 'ServerError';
  }
}

export function formatError(error: unknown): string {
  if (error instanceof CalcomError) {
    return `[${error.code}] ${error.message}`;
  }
  if (error instanceof Error) {
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return '[NETWORK_ERROR] Could not connect to Cal.com API. Check your internet connection.';
    }
    if (error.message.includes('timeout') || error.message.includes('AbortError')) {
      return '[TIMEOUT] Request timed out. Try again.';
    }
    return error.message;
  }
  return String(error);
}
